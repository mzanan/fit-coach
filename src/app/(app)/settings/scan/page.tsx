import { InbodyCard } from "@/components/settings/InbodyCard";
import { Page } from "@/components/ui/Page";
import { hasVisionAi } from "@/lib/ai/groq";
import { requireUser } from "@/lib/session";

export default async function ScanSettingsPage() {
  await requireUser();

  return (
    <Page
      backHref="/settings"
      backLabel="Back to settings"
      title="InBody scan"
      description="Import a result sheet. The values are read for you."
    >
      <InbodyCard aiReady={hasVisionAi()} />
    </Page>
  );
}
