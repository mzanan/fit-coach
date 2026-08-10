import Link from "next/link";

import { CoachPanel } from "@/components/coach/CoachPanel";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Page } from "@/components/ui/Page";
import { getAiSettings } from "@/lib/ai/aiCredentials";
import { canTools } from "@/lib/ai/capabilities";
import { getFullConversation } from "@/lib/data/coachMessages";
import { getPendingPreview } from "@/lib/data/coachPendingWrite";
import { dayConfig, daysSinceMonday, todayLogicalDay } from "@/lib/dates";
import { ensureProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";

export default async function CoachPage() {
  const user = await requireUser();
  const [ai, history, profile, pending] = await Promise.all([
    getAiSettings(user.id),
    getFullConversation(user.id),
    ensureProfile(user.id),
    getPendingPreview(user.id),
  ]);
  const weekDays = daysSinceMonday(todayLogicalDay(dayConfig(profile))) + 1;
  let weeklySummaryAvailable = false;
  if (ai) {
    try {
      weeklySummaryAvailable = await canTools(ai.provider, ai.model);
    } catch {
      weeklySummaryAvailable = false;
    }
  }

  return (
    <Page
      title="Coach"
      description="Answers based on what you have logged."
      className="flex h-full flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-block">
        {!ai ? (
          <EmptyState
            size="sm"
            title="AI coaching is off"
            body="Add your OpenRouter API key to get real answers. Without it you only get a rule-based snapshot."
            action={
              <Button variant="solid" asChild>
                <Link href="/settings/ai">Set up AI</Link>
              </Button>
            }
          />
        ) : null}
        <CoachPanel
          initial={history}
          effort={ai?.reasoningEffort ?? null}
          diningMode={profile.dining_mode}
          pending={pending}
          weekDays={weeklySummaryAvailable ? weekDays : null}
        />
      </div>
    </Page>
  );
}
