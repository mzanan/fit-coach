import { NextResponse } from "next/server";
import { getRun } from "workflow/api";

import { getImportRun } from "@/lib/data/importRuns";
import { requireApiUser } from "@/lib/session";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const user = await requireApiUser();
  if (user instanceof NextResponse) return user;

  const { runId } = await params;
  if (!(await getImportRun(user.id, runId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await getRun(runId).cancel();
  } catch (error) {
    console.error("md import: cancel failed", error);
    return NextResponse.json(
      { error: "Could not cancel the import" },
      { status: 502 },
    );
  }
  return NextResponse.json({ cancelled: true });
}
