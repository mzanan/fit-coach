import { NextResponse } from "next/server";

import { COACH_MAX_DURATION_SECONDS } from "@/lib/constants";
import { expireStaleMessage, getMessage } from "@/lib/data/coachMessages";
import { requireApiUser } from "@/lib/session";

const MAX_STREAM_AGE_MS = (COACH_MAX_DURATION_SECONDS + 30) * 1000;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireApiUser();
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const message = await getMessage(user.id, id);
  if (!message) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const stale =
    message.status === "streaming" &&
    Date.now() - message.created_at.getTime() > MAX_STREAM_AGE_MS;
  if (stale) await expireStaleMessage(user.id, id, MAX_STREAM_AGE_MS);

  return NextResponse.json({
    content: message.content,
    status: stale ? "stopped" : message.status,
    generated: message.generated,
    daySummary: message.daySummary ?? null,
    learned: message.learned ?? null,
  });
}
