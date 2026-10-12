import { NextResponse } from "next/server";
import { z } from "zod";

import { stopExchange } from "@/lib/data/coachMessages";
import { withApiUser } from "@/lib/session";

const bodySchema = z.object({
  ids: z.array(z.string().min(1).max(64)).min(1).max(2),
});

export const POST = withApiUser(async (user, request: Request) => {
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
});
