import { NextResponse } from "next/server";

import { coachReply } from "@/lib/ai/coach";
import { coachNdjsonResponse } from "@/lib/coachStream";
import { ensureProfile } from "@/lib/profile";
import { getUser } from "@/lib/session";

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let question: string | undefined;
  try {
    const body = (await request.json()) as { question?: string };
    question = body.question;
  } catch {
    question = undefined;
  }

  const profile = await ensureProfile(user.id);

  return coachNdjsonResponse((send) =>
    coachReply(user.id, profile, question, send, request.signal),
  );
}
