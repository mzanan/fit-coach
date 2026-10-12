import { NextResponse } from "next/server";

import {
  consolidateMemories,
  expireStaleFacts,
  pruneEvents,
} from "@/lib/ai/maintenance";
import { applyDuePlans } from "@/lib/data/plans";
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

  return runWithDbContext({ source: "cron" }, async () => {
    const facts = await expireStaleFacts();
    const memory = await consolidateMemories();
    const events = await pruneEvents();
    const plans = await applyDuePlans();
    return NextResponse.json({ facts, memory, events, plans });
  });
}
