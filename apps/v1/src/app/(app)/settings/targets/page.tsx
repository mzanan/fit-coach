import { Page } from "@/components/ui/Page";
import { TargetsForm } from "@/components/settings/TargetsForm";
import { ensureProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";

export default async function TargetsPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);

  return (
    <Page
      backHref="/settings"
      backLabel="Back to settings"
      title="Macro targets"
      description="What Today measures your intake against."
    >
      <TargetsForm profile={profile} />
    </Page>
  );
}
