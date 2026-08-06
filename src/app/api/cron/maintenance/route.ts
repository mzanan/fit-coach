import { NextResponse } from "next/server";

import { consolidateMemories, expireStaleFacts } from "@/lib/ai/maintenance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const facts = await expireStaleFacts();
  const memory = await consolidateMemories();
  return NextResponse.json({ facts, memory });
}
