import { NextResponse } from "next/server";

import { expireStaleFacts } from "@/lib/ai/maintenance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const facts = await expireStaleFacts();
  return NextResponse.json({ facts });
}
