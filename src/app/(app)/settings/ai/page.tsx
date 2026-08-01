import { AiCard } from "@/components/settings/AiCard";
import { Page } from "@/components/ui/Page";
import { groqModels } from "@/lib/ai/groq";
import { getAiSetup, providerApiKey } from "@/lib/ai/providers";
import { listModels, type ModelInfo } from "@/lib/ai/registry";
import { ensureProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";

async function savedGroqModels(userId: string): Promise<ModelInfo[] | null> {
  const apiKey = await providerApiKey(userId, "groq");
  if (!apiKey) return null;
  const result = await groqModels(apiKey);
  return result.status === "ok" ? result.models : null;
}

export default async function AiSettingsPage() {
  const user = await requireUser();
  await ensureProfile(user.id);
  const setup = await getAiSetup(user.id);
  const needsGroqList = setup.active?.provider === "groq";

  const [openrouterModels, groqList] = await Promise.all([
    listModels().catch(() => null),
    needsGroqList ? savedGroqModels(user.id) : Promise.resolve(null),
  ]);

  return (
    <Page
      backHref="/settings"
      backLabel="Back to settings"
      title="AI"
      description="Bring your own API key and pick the provider and model behind the coach."
    >
      <AiCard
        setup={setup}
        openrouterModels={openrouterModels ?? []}
        openrouterFailed={openrouterModels === null}
        groqModels={groqList}
        groqFailed={needsGroqList && groqList === null}
      />
    </Page>
  );
}
