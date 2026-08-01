import { AiCard } from "@/components/settings/AiCard";
import { Page } from "@/components/ui/Page";
import { groqModels } from "@/lib/ai/groq";
import { getAiSettings, userModelRef } from "@/lib/ai/providers";
import { listModels, type ModelInfo } from "@/lib/ai/registry";
import { requireUser } from "@/lib/session";

async function savedGroqModels(userId: string): Promise<ModelInfo[] | null> {
  const ref = await userModelRef(userId);
  if (!ref) return null;
  const result = await groqModels(ref.apiKey);
  return result.status === "ok" ? result.models : null;
}

export default async function AiSettingsPage() {
  const user = await requireUser();
  const settings = await getAiSettings(user.id);
  const models =
    settings?.provider === "groq"
      ? await savedGroqModels(user.id)
      : await listModels().catch(() => null);

  return (
    <Page
      backHref="/settings"
      backLabel="Back to settings"
      title="AI"
      description="Bring your own API key and pick the provider and model behind the coach."
    >
      <AiCard
        configured={Boolean(settings)}
        currentProvider={settings?.provider ?? "openrouter"}
        currentModel={settings?.model ?? null}
        models={models ?? []}
        modelsFailed={models === null}
      />
    </Page>
  );
}
