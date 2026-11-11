import { NextResponse } from "next/server";

import { loadSavedExtraction } from "@/lib/importSaved";
import { requireApiUser } from "@/lib/session";

export async function GET() {
  const user = await requireApiUser();
  if (user instanceof NextResponse) return user;

  const extraction = await loadSavedExtraction(user.id);
  return NextResponse.json({ extraction });
}
