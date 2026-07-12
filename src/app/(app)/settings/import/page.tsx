import { MdImportFlow } from "@/components/import/MdImportFlow";
import { dayConfig, todayLogicalDay } from "@/lib/dates";
import { ensureProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";

export default async function MdImportPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);
  const today = todayLogicalDay(dayConfig(profile));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Import from Markdown</h1>
        <p className="text-sm text-muted-foreground">
          Migrate your markdown tracking log: extract, review, then import.
        </p>
      </div>
      <MdImportFlow today={today} />
    </div>
  );
}
