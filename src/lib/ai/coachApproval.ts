import "server-only";

import type { ModelMessage } from "ai";

import { userModelRef } from "@/lib/ai/aiCredentials";
import { toolsRouting } from "@/lib/ai/capabilities";
import {
  deferMemory,
  exchangeOf,
  toolSetup,
  turnLimitReached,
  TURN_LIMIT_TEXT,
  type CoachResult,
  type DaySummary,
} from "@/lib/ai/coach";
import { buildCoachTools, previewApproval } from "@/lib/ai/coachTools";
import {
  approvalResponseMessage,
  chatToolsStream,
  type ApprovalRequest,
  type CoachEvent,
} from "@/lib/ai/provider";
import { canWriteMeals } from "@/lib/ai/writeGate";
import { logAiEvent } from "@/lib/data/aiEvents";
import {
  beginExchange,
  discardExchange,
  finishExchange,
  getConversation,
  updateExchangeContent,
} from "@/lib/data/coachMessages";
import {
  savePendingWrite,
  takePendingWrite,
  type LogFatiguePreview,
  type LogMeasurementPreview,
  type LogMealPreview,
  type LogWorkoutSessionPreview,
  type PendingPreview,
} from "@/lib/data/coachPendingWrite";
import { getDayData } from "@/lib/data/today";
import { dayConfig, todayLogicalDay } from "@/lib/dates";
import type { Profile } from "@/lib/db/schema";
import {
  categoryLabel,
  FATIGUE_TOOL,
  fatigueExtrasLabel,
  fatigueTimeLabel,
  INTERRUPTED_ANSWER,
  MEASUREMENT_TOOL,
  measurementTypeLabel,
  measurementUnit,
  WORKOUT_TOOL,
  WRITE_TOOL,
  WRITE_TOOLS,
} from "@/lib/constants";
import { kcalOf } from "@/lib/macros";
import { round } from "@/lib/utils";

const DENIED = "Not logged. Nothing was written.";

const RESUME_FAILED =
  "The coach lost the connection while confirming. It may or may not have been written: check before asking again.";

const NOT_WRITTEN =
  "Nothing was written. Whatever you confirmed may have changed since you were asked. Ask again.";

export async function daySummaryAfterWrite(
  userId: string,
  profile: Profile,
  day: string,
): Promise<DaySummary> {
  const dayData = await getDayData(userId, profile, day);
  return dayData.summary;
}

export async function resolvePendingWrite(
  userId: string,
  profile: Profile,
  approvalId: string,
  approved: boolean,
  itemId?: string,
  onEvent?: (event: CoachEvent) => void,
  signal?: AbortSignal,
): Promise<CoachResult> {
  const pending = await takePendingWrite(userId, approvalId);
  if (!pending) {
    return {
      status: "answered",
      text: "That confirmation is no longer valid. Ask again.",
      generated: false,
    };
  }

  const question = pending.question ?? undefined;
  const appGenerated = pending.appGenerated;
  const learned = pending.learned;

  if (!approved) {
    const exchange = await beginExchange(
      userId,
      question ?? null,
      INTERRUPTED_ANSWER,
      "stopped",
    );
    try {
      await finishExchange(exchange, DENIED, { generated: false, learned });
      return { status: "answered", text: DENIED, generated: false, learned };
    } catch (error) {
      await discardExchange(exchange);
      throw error;
    }
  }

  if (await turnLimitReached(userId)) {
    onEvent?.({ type: "rate_limited" });
    await logAiEvent(userId, "turn_limit_hit");
    await savePendingWrite(userId, pending);
    return { status: "answered", text: TURN_LIMIT_TEXT, generated: false };
  }

  const exchange = await beginExchange(
    userId,
    question ?? null,
    INTERRUPTED_ANSWER,
    "stopped",
  );

  try {
    const ref = await userModelRef(userId);
    if (!ref) {
      await savePendingWrite(userId, pending);
      await discardExchange(exchange);
      return {
        status: "answered",
        text: "Add your AI provider key in Settings > AI to use the coach.",
        generated: false,
      };
    }

    const allowWrite = canWriteMeals(ref.model);
    if (!allowWrite) {
      console.error(
        `coach: pending write approved but the now-active model cannot write, user=${userId} model=${ref.provider}/${ref.model}`,
      );
      await savePendingWrite(userId, pending);
      await discardExchange(exchange);
      return {
        status: "answered",
        text: "Your AI model changed since you asked to log that, and this one cannot log meals. Switch back, or log it manually from the Today screen.",
        generated: false,
      };
    }

    let toolPin: string[] | null | undefined = null;
    try {
      toolPin = await toolsRouting(ref.provider, ref.model);
    } catch {
      toolPin = null;
    }
    const history = await getConversation(userId);
    const setup = await toolSetup(
      userId,
      profile,
      history,
      allowWrite,
      question,
      learned,
    );

    const answered = [
      ...pending.messages,
      approvalResponseMessage(pending.approvalIds, true),
    ];
    const mealPreview = pending.previews.find(
      (preview): preview is LogMealPreview => preview.toolName === WRITE_TOOL,
    );
    const fatiguePreview = pending.previews.find(
      (preview): preview is LogFatiguePreview =>
        preview.toolName === FATIGUE_TOOL,
    );
    const workoutPreview = pending.previews.find(
      (preview): preview is LogWorkoutSessionPreview =>
        preview.toolName === WORKOUT_TOOL,
    );
    const measurementPreview = pending.previews.find(
      (preview): preview is LogMeasurementPreview =>
        preview.toolName === MEASUREMENT_TOOL,
    );
    const day =
      mealPreview?.day ??
      fatiguePreview?.day ??
      workoutPreview?.day ??
      measurementPreview?.day ??
      todayLogicalDay(dayConfig(profile));
    const chosen =
      mealPreview && itemId
        ? mealPreview.variants.find((variant) => variant.id === itemId)
        : undefined;

    const { text, toolLog, writeOutputs, approvals, messages } =
      await chatToolsStream(toolPin ? { ...ref, routeOnly: toolPin } : ref, {
        userId,
        instructions: setup.instructions,
        messages: [...setup.messages, ...answered],
        tools: buildCoachTools(
          userId,
          profile,
          day,
          allowWrite,
          chosen && mealPreview
            ? {
                toolCallId: mealPreview.toolCallId,
                itemId: chosen.id,
                itemName: chosen.name,
              }
            : undefined,
        ),
        approvalFor: WRITE_TOOLS,
        onEvent: onEvent ?? (() => {}),
        signal,
      });

    if (signal?.aborted) {
      await updateExchangeContent(exchange, INTERRUPTED_ANSWER, learned);
      return {
        status: "answered",
        text: INTERRUPTED_ANSWER,
        generated: false,
        learned,
      };
    }

    if (approvals.length) {
      const chained = await chainApproval(
        userId,
        day,
        question,
        [...answered, ...messages],
        approvals,
        appGenerated,
        learned,
        signal,
      );
      if (chained) {
        if (chained.status === "pending" && chained.saved) {
          await discardExchange(exchange);
        }
        return chained;
      }
    }

    const outcomeByCallId = new Map(
      writeOutputs.map((output) => [output.toolCallId, output]),
    );
    if (!writeOutputs.some((output) => output.logged)) {
      const failure = writeOutputs.find((output) => output.error)?.error;
      await finishExchange(exchange, failure ?? NOT_WRITTEN, {
        generated: false,
        learned,
      });
      return {
        status: "answered",
        text: failure ?? NOT_WRITTEN,
        generated: false,
        learned,
      };
    }

    const logged = pending.previews
      .filter((preview) => outcomeByCallId.get(preview.toolCallId)?.logged)
      .map((preview) => {
        const isChosenMeal =
          preview.toolName === WRITE_TOOL &&
          chosen &&
          preview.toolCallId === mealPreview?.toolCallId;
        if (!isChosenMeal) return preview;
        const portions = preview.portions || 1;
        const scaled = {
          protein_g: round(chosen.protein_g * portions),
          fat_g: round(chosen.fat_g * portions),
          carbs_g: round(chosen.carbs_g * portions),
        };
        return {
          ...preview,
          name: chosen.name,
          ...scaled,
          kcal: round(kcalOf(scaled)),
        };
      });
    const wroteMeal = logged.some((preview) => preview.toolName === WRITE_TOOL);
    const answer = text || confirmationLines(logged);
    const daySummary = wroteMeal
      ? await daySummaryAfterWrite(userId, profile, day)
      : undefined;
    await finishExchange(exchange, answer, {
      generated: Boolean(text),
      daySummary,
      learned,
    });
    if (text && !signal?.aborted) {
      deferMemory(
        ref,
        userId,
        setup.memory,
        exchangeOf(toolLog, question, answer, appGenerated),
      );
    }
    return {
      status: "answered",
      text: answer,
      generated: Boolean(text),
      daySummary,
      learned,
    };
  } catch {
    if (signal?.aborted) {
      await updateExchangeContent(exchange, INTERRUPTED_ANSWER, learned);
      return {
        status: "answered",
        text: INTERRUPTED_ANSWER,
        generated: false,
        learned,
      };
    }
    await finishExchange(exchange, RESUME_FAILED, { generated: false, learned });
    return {
      status: "answered",
      text: RESUME_FAILED,
      generated: false,
      learned,
    };
  }
}

async function chainApproval(
  userId: string,
  day: string,
  question: string | undefined,
  messages: ModelMessage[],
  approvals: ApprovalRequest[],
  appGenerated: boolean,
  learned: string[],
  signal?: AbortSignal,
): Promise<CoachResult | null> {
  const resolved = await Promise.all(
    approvals.map((approval) => previewApproval(userId, day, approval)),
  );
  const previews = resolved.flatMap((preview) =>
    preview.ok ? [preview.preview] : [],
  );
  if (!previews.length) return null;

  const saved = !signal?.aborted;
  if (saved) {
    await savePendingWrite(userId, {
      approvalId: approvals[0].approvalId,
      approvalIds: approvals.map((approval) => approval.approvalId),
      question: question ?? null,
      appGenerated,
      learned,
      messages,
      previews,
    });
  }
  return {
    status: "pending",
    approvalId: approvals[0].approvalId,
    previews,
    saved,
  };
}

function mealLoggedLine(preview: LogMealPreview): string {
  const portions = preview.portions === 1 ? "" : ` x${preview.portions}`;
  return `Logged ${preview.name}${portions} as ${categoryLabel(preview.category).toLowerCase()}: ${preview.protein_g}g protein, ${preview.fat_g}g fat, ${preview.carbs_g}g carbs, ${preview.kcal} kcal.`;
}

function fatigueLoggedLine(
  preview: Extract<PendingPreview, { toolName: typeof FATIGUE_TOOL }>,
): string {
  const extras = fatigueExtrasLabel(preview.sleepHours, preview.sleepLocation);
  const label = fatigueTimeLabel(preview.timeOfDay);
  if (preview.score == null) {
    return `Logged ${label} sleep${extras ? ` (${extras})` : ""}, energy score still pending.`;
  }
  return `Logged ${label} fatigue: ${preview.score}/5${extras ? ` (${extras})` : ""}.`;
}

function workoutLoggedLine(preview: LogWorkoutSessionPreview): string {
  const exerciseCount = preview.exercises.length;
  const label = preview.label || "workout";
  return `Logged ${label}: ${exerciseCount} exercise${exerciseCount === 1 ? "" : "s"}.`;
}

function measurementLoggedLine(preview: LogMeasurementPreview): string {
  const label = measurementTypeLabel(preview.type);
  if (preview.value == null) return `Logged ${label.toLowerCase()}.`;
  return `Logged ${label.toLowerCase()}: ${preview.value}${measurementUnit(preview.type)}.`;
}

function confirmationLines(previews: PendingPreview[]): string {
  return previews
    .map((preview) => {
      if (preview.toolName === WRITE_TOOL) return mealLoggedLine(preview);
      if (preview.toolName === FATIGUE_TOOL) return fatigueLoggedLine(preview);
      if (preview.toolName === WORKOUT_TOOL) return workoutLoggedLine(preview);
      if (preview.toolName === MEASUREMENT_TOOL)
        return measurementLoggedLine(preview);
      return `Rule "${preview.key}" set to: ${preview.newValue}.`;
    })
    .join("\n");
}
