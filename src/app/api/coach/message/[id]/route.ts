import { NextResponse } from "next/server";

import { getMessage } from "@/lib/data/coachMessages";
import { getUser } from "@/lib/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const message = await getMessage(user.id, id);
  if (!message) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    content: message.content,
    status: message.status,
    generated: message.generated,
    daySummary: message.daySummary ?? null,
  });
}
