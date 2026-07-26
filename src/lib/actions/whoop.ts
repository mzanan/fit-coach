"use server";

import { revalidatePath } from "next/cache";

import {
  disconnectWhoop,
  syncWhoop,
  type WhoopSyncResult,
} from "@/lib/integrations/whoop";
import { requireUser } from "@/lib/session";

export async function syncWhoopNow(): Promise<WhoopSyncResult> {
  const user = await requireUser();
  const result = await syncWhoop(user.id);
  revalidatePath("/settings");
  revalidatePath("/");
  return result;
}

export async function disconnectWhoopNow(): Promise<void> {
  const user = await requireUser();
  await disconnectWhoop(user.id);
  revalidatePath("/settings");
}
