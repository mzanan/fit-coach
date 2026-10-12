import { NextResponse } from "next/server";

import {
  consolidateMemories,
  expireStaleFacts,
  pruneEvents,
} from "@/lib/ai/maintenance";
import { applyDuePlans } from "@/lib/data/plans";
import { listUserIds } from "@/lib/data/mcpUser";
import { runWithDbContext } from "@/lib/db/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const users = await listUserIds();
  const totals = { facts: 0, consolidated: 0, skipped: 0, events: 0, plans: 0, failed: 0 };
  for (const userId of users) {
    try {
      await runWithDbContext({ userId, source: "cron" }, async () => {
        const facts = await expireStaleFacts();
        const memory = await consolidateMemories();
        const events = await pruneEvents();
        const plans = await applyDuePlans();
        totals.facts += facts.deactivated;
        totals.consolidated += memory.consolidated;
        totals.skipped += memory.skipped;
        totals.events += events.deleted;
        totals.plans += plans;
      });
    } catch (error) {
      totals.failed += 1;
      console.error("maintenance: user run failed", userId, error instanceof Error ? error.message : error);
    }
  }
  return NextResponse.json({ users: users.length, ...totals });
}
