import { History } from "lucide-react";

import { AiCard } from "@/components/settings/AiCard";
import { ListGroup, ListRow } from "@/components/ui/ListRow";
import { Page } from "@/components/ui/Page";
import type {
  KeyedModelList,
  KeyedModelLists,
} from "@/components/settings/useAiSettings";
import {
  cachedProviderModels,
  getAiSetup,
  type AiSetup,
} from "@/lib/ai/aiCredentials";
import { listModels } from "@/lib/ai/capabilities";
import { KEYED_PROVIDERS, type KeyedProvider } from "@/lib/ai/options";
import { ensureProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";

async function keyedList(
  userId: string,
  saved: AiSetup["saved"],
  provider: KeyedProvider,
): Promise<KeyedModelList> {
  const hasCredential = saved.some(
    (credential) => credential.provider === provider,
  );
  if (!hasCredential) return { models: null, failed: false };
  const result = await cachedProviderModels(userId, provider);
  const models = result?.status === "ok" ? result.models : null;
  return { models, failed: models === null };
}

export default async function AiSettingsPage() {
  const user = await requireUser();
  await ensureProfile(user.id);
  const setup = await getAiSetup(user.id);

  const [openrouterModels, keyedLists] = await Promise.all([
    listModels().catch(() => null),
    Promise.all(
      KEYED_PROVIDERS.map((provider) =>
        keyedList(user.id, setup.saved, provider),
      ),
    ),
  ]);
  const keyed = Object.fromEntries(
    KEYED_PROVIDERS.map((provider, index) => [provider, keyedLists[index]]),
  ) as KeyedModelLists;

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
        keyed={keyed}
      />
      <ListGroup className="mt-block">
        <ListRow href="/settings/ai/events" icon={History} label="Activity" />
      </ListGroup>
    </Page>
  );
}
