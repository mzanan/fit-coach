import { CoachRulesForm } from "@/components/settings/CoachRulesForm";
import { Page } from "@/components/ui/Page";
import { ensureProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";

export default async function CoachRulesPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);

  return (
    <Page
      backHref="/settings"
      backLabel="Back to settings"
      title="Coach rules"
      description="The method the coach follows. Paste your own to replace the built-in macro and meal rules."
    >
      <CoachRulesForm initial={profile.coach_rules} />
    </Page>
  );
}
