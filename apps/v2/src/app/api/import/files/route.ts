import { NextResponse } from "next/server";

import { listImportFiles } from "@/lib/data/importFiles";
import { reconcileImportRun } from "@/lib/importHealth";
import { requireApiUser } from "@/lib/session";

export async function GET() {
  const user = await requireApiUser();
  if (user instanceof NextResponse) return user;

  const { state } = await reconcileImportRun(user.id);
  const files = await listImportFiles(user.id);
  return NextResponse.json({ files, state });
}
