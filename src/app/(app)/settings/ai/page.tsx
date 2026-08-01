import { AiCard } from "@/components/settings/AiCard";
import { Page } from "@/components/ui/Page";
import { getAiSettings } from "@/lib/ai/providers";
import { listModels, type ModelInfo } from "@/lib/ai/registry";
import { requireUser } from "@/lib/session";

export default async function AiSettingsPage() {
  const user = await requireUser();
  const [settings, models] = await Promise.all([
    getAiSettings(user.id),
    listModels().catch((): ModelInfo[] => []),
  ]);

  return (
    <Page
      backHref="/settings"
      backLabel="Back to settings"
      title="AI"
      description="Bring your own OpenRouter key and pick the model behind the coach."
    >
      <AiCard
        configured={Boolean(settings)}
        currentModel={settings?.model ?? null}
        models={models}
      />
    </Page>
  );
}
