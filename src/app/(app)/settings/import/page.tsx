import { MdImportFlow } from "@/components/import/MdImportFlow";
import { PageHeader } from "@/components/ui/PageHeader";
import { dayConfig, todayLogicalDay } from "@/lib/dates";
import { ensureProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";

export default async function MdImportPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);
  const today = todayLogicalDay(dayConfig(profile));

  return (
    <div className="space-y-block">
      <PageHeader
        backHref="/settings"
        backLabel="Back to settings"
        title="Import from Markdown"
        description="Extract, review, then import. Nothing is saved until you confirm."
      />
      <MdImportFlow today={today} />
    </div>
  );
}
