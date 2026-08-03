import Link from "next/link";

import { MdImportFlow } from "@/components/import/MdImportFlow";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Page } from "@/components/ui/Page";
import { PROVIDER_LABEL } from "@/lib/ai/options";
import { getAiSettings } from "@/lib/ai/providers";
import { canStructured } from "@/lib/ai/registry";
import { dayConfig, todayLogicalDay } from "@/lib/dates";
import { ensureProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";

export default async function MdImportPage() {
  const user = await requireUser();
  const [profile, ai] = await Promise.all([
    ensureProfile(user.id),
    getAiSettings(user.id),
  ]);
  const today = todayLogicalDay(dayConfig(profile));
  let structuredOk: boolean | null = false;
  if (ai) {
    try {
      structuredOk = await canStructured(ai.provider, ai.model);
    } catch {
      structuredOk = null;
    }
  }

  return (
    <Page
      backHref="/settings"
      backLabel="Back to settings"
      title="Import from Markdown"
      description="Extract, review, then import. Nothing is saved until you confirm."
      className="flex h-full flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {!ai ? (
          <EmptyState
            title="Import needs your AI key"
            body="Add an API key to extract meals and workouts from a Markdown log."
            action={
              <Button variant="solid" asChild>
                <Link href="/settings/ai">Set up AI</Link>
              </Button>
            }
          />
        ) : structuredOk === null ? (
          <EmptyState
            title="Could not check your model"
            body={`${PROVIDER_LABEL[ai.provider]} did not answer the capability check. Reload to retry.`}
          />
        ) : !structuredOk ? (
          <EmptyState
            title="Your model can't run the import"
            body={`${ai.model} has no provider with structured output. Pick a model with the JSON badge.`}
            action={
              <Button variant="solid" asChild>
                <Link href="/settings/ai">Change model</Link>
              </Button>
            }
          />
        ) : (
          <MdImportFlow today={today} />
        )}
      </div>
    </Page>
  );
}
