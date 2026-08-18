import { NextResponse } from "next/server";
import { z } from "zod";

import { stopExchange } from "@/lib/data/coachMessages";
import { requireApiUser } from "@/lib/session";

const bodySchema = z.object({
  ids: z.array(z.string().min(1).max(64)).min(1).max(2),
});

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (user instanceof NextResponse) return user;

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

  const stopped = await stopExchange(user.id, parsed.data.ids);
  return NextResponse.json({ stopped });
}
