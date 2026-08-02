"use server";

import { revalidatePath } from "next/cache";

import { clearConversation } from "@/lib/data/coachMessages";
import { requireUser } from "@/lib/session";

export async function clearCoachChat(): Promise<void> {
  const user = await requireUser();
  await clearConversation(user.id);
  revalidatePath("/coach");
}
