import { InbodyCard } from "@/components/settings/InbodyCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { hasVisionAi } from "@/lib/ai/groq";
import { requireUser } from "@/lib/session";

export default async function ScanSettingsPage() {
  await requireUser();

  return (
    <div className="space-y-block">
      <PageHeader
        backHref="/settings"
        backLabel="Back to settings"
        title="InBody scan"
        description="Import a result sheet. The values are read for you."
      />
      <InbodyCard aiReady={hasVisionAi()} />
    </div>
  );
}
