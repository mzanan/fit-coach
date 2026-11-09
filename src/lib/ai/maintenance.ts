import "server-only";

import { pruneAiEvents } from "@/lib/data/aiEvents";
import { applyDuePlansForUser } from "@/lib/data/plans";
import { listUserIds } from "@/lib/data/users";
import { pruneWriteHistory } from "@/lib/data/writeLedger";
import { WRITE_HISTORY_DAYS } from "@/lib/constants";
import { runAsUser } from "@/lib/db/context";

export async function pruneEvents(userId: string): Promise<{ deleted: number }> {
  return pruneAiEvents(userId);
}

export async function runMaintenanceForAllUsers() {
  const users = await listUserIds();
  const totals = { users: users.length, events: 0, plans: 0, history: 0, failed: 0 };
  for (const userId of users) {
    try {
      await runAsUser(userId, "cron", async () => {
        const events = await pruneEvents(userId);
        if (await applyDuePlansForUser(userId)) totals.plans += 1;
        totals.history += await pruneWriteHistory(userId, WRITE_HISTORY_DAYS);
        totals.events += events.deleted;
      });
    } catch (error) {
      totals.failed += 1;
      console.error("maintenance: user run failed", userId, error instanceof Error ? error.message : error);
    }
  }
  return totals;
}
