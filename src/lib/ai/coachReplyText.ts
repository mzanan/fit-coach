import type { ModelRef } from "@/lib/ai/aiCredentials";
import { PROVIDER_LABEL } from "@/lib/ai/options";
import type { ResolveFailure } from "@/lib/catalogMeal";
import type { CoachContext } from "@/lib/ai/coachContext";

export function deterministicReply(ctx: CoachContext): string {
  return `Add your AI provider key in Settings > AI to enable coaching. Snapshot:\n${ctx.lines.join("\n")}`;
}

export function aiErrorReply(ctx: CoachContext): string {
  return `The coach could not reach your AI model. Check your key and model in Settings > AI, or try again. Snapshot:\n${ctx.lines.join("\n")}`;
}

export function limitErrorReply(
  provider: ModelRef["provider"],
  error: unknown,
  ctx: CoachContext,
): string | null {
  const status = (error as { statusCode?: number })?.statusCode;
  const message = error instanceof Error ? error.message : "";
  if (status !== 429 && !/rate limit|quota/i.test(message)) return null;

  const label = PROVIDER_LABEL[provider];
  const daily = /per[- ]day|RPD/i.test(message);
  const detail = daily
    ? "Your daily quota on the free tier is used up. It resets tomorrow, or add credits to your account."
    : "You are being rate limited right now. Wait a minute and ask again.";
  return `${label}: ${detail} Snapshot:\n${ctx.lines.join("\n")}`;
}

export function previewFailure(reason: ResolveFailure, error: string): string {
  if (reason === "no_macros") return error;
  return "The coach tried to log a meal it could not identify in your catalog. Ask again naming the item.";
}

const LOG_INTENT =
  /\b(registr\w*|anot\w*|logue\w*|loguear|agreg\w*|a[ñn]ad\w*|sum(?!mar)\w*|carg\w*|log)\b/i;

const CLAIMED_WRITE =
  /\b(registrad[oa]s?|registr[eé]|anotad[oa]s?|a[ñn]adid[oa]s?|agregad[oa]s?|guardad[oa]s?|logged)\b|\b(se procede a|procedo a|voy a)\s+(registrar|anotar|guardar|a[ñn]adir|agregar)/i;

const NOTHING_LOGGED =
  "\n\n(Nothing was logged. The coach did not actually run the log, so check Today and log it from there if you need it.)";

export function unloggedWarning(
  question: string | undefined,
  text: string,
  wrote: boolean,
): string {
  if (wrote || !question) return "";
  if (!LOG_INTENT.test(question)) return "";
  if (!CLAIMED_WRITE.test(text)) return "";
  return NOTHING_LOGGED;
}

export function askOf(question?: string): string {
  return question?.trim()
    ? question.trim()
    : "Give a short read on how today and the week are going, and the next action.";
}

export function exchangeOf(
  toolLog: string[],
  question: string | undefined,
  text: string,
  appGenerated = false,
): string {
  const asked = appGenerated
    ? "(tapped the weekly summary button)"
    : question?.trim() || "(daily check-in)";
  return [
    ...(toolLog.length
      ? ["Data the coach read from the app:", ...toolLog]
      : []),
    `User: ${asked}`,
    `Coach: ${text}`,
  ].join("\n");
}

const LEARNED_ADDENDUM_HEAD =
  "You just recorded this about the user, from the message they sent you in this turn:";

const LEARNED_ADDENDUM_TAIL =
  "Open your reply by acknowledging it in one short clause, in the user's language, so they know it was saved. Then answer their message. Take it into account in this very answer: if it is a food preference and the food is not in their catalog, say so and offer to add it, do not just ignore it and suggest something else.";

export function learnedAddendum(facts: string[]): string[] {
  return facts.length
    ? [
        [
          LEARNED_ADDENDUM_HEAD,
          ...facts.map((fact) => `- ${fact}`),
          LEARNED_ADDENDUM_TAIL,
        ].join("\n"),
      ]
    : [];
}
