"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { REASONING_EFFORTS } from "@/lib/ai/options";
import { getAiSetup, updateReasoningEffort } from "@/lib/ai/providers";
import { clearConversation } from "@/lib/data/coachMessages";
import { requireUser } from "@/lib/session";

export async function clearCoachChat(): Promise<void> {
  const user = await requireUser();
  await clearConversation(user.id);
  revalidatePath("/coach");
}

export async function updateReasoningEffortAction(
  input: unknown,
): Promise<{ error?: string }> {
  const user = await requireUser();
  const parsed = z.enum(REASONING_EFFORTS).safeParse(input);
  if (!parsed.success) return { error: "Unknown effort." };

  const { active } = await getAiSetup(user.id);
  if (!active) return { error: "Add an API key in Settings > AI first." };

  await updateReasoningEffort(user.id, active.provider, parsed.data);
  revalidatePath("/coach");
  revalidatePath("/settings/ai");
  return {};
}
