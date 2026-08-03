import { NextResponse } from "next/server";
import { z } from "zod";

import { resolvePendingWrite } from "@/lib/ai/coach";
import { coachNdjsonResponse } from "@/lib/coachStream";
import { ensureProfile } from "@/lib/profile";
import { getUser } from "@/lib/session";

const bodySchema = z.object({
  approvalId: z.string().min(1),
  approved: z.boolean(),
});

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const profile = await ensureProfile(user.id);

  return coachNdjsonResponse((send) =>
    resolvePendingWrite(
      user.id,
      profile,
      parsed.data.approvalId,
      parsed.data.approved,
      send,
      request.signal,
    ),
  );
}
