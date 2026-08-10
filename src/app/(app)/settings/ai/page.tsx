import { AiCard } from "@/components/settings/AiCard";
import { Page } from "@/components/ui/Page";
import { cachedProviderModels, getAiSetup } from "@/lib/ai/aiCredentials";
import { listModels, type ModelInfo } from "@/lib/ai/capabilities";
import { ensureProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";

async function savedModels(
  userId: string,
  hasCredential: boolean,
  provider: "groq" | "google",
): Promise<ModelInfo[] | null> {
  if (!hasCredential) return null;
  const result = await cachedProviderModels(userId, provider);
  return result?.status === "ok" ? result.models : null;
}

export default async function AiSettingsPage() {
  const user = await requireUser();
  await ensureProfile(user.id);
  const setup = await getAiSetup(user.id);
  const hasGroq = setup.saved.some(
    (credential) => credential.provider === "groq",
  );
  const hasGoogle = setup.saved.some(
    (credential) => credential.provider === "google",
  );

  const [openrouterModels, groqList, googleList] = await Promise.all([
    listModels().catch(() => null),
    savedModels(user.id, hasGroq, "groq"),
    savedModels(user.id, hasGoogle, "google"),
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
        groqFailed={hasGroq && groqList === null}
        googleModels={googleList}
        googleFailed={hasGoogle && googleList === null}
      />
    </Page>
  );
}
