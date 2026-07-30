import { MdImportFlow } from "@/components/import/MdImportFlow";
import { Page } from "@/components/ui/Page";
import { dayConfig, todayLogicalDay } from "@/lib/dates";
import { ensureProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";

export default async function MdImportPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);
  const today = todayLogicalDay(dayConfig(profile));

  return (
    <Page
      backHref="/settings"
      backLabel="Back to settings"
      title="Import from Markdown"
      description="Extract, review, then import. Nothing is saved until you confirm."
    >
      <MdImportFlow today={today} />
    </Page>
  );
}
