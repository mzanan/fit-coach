import Link from "next/link";

import { CoachPanel } from "@/components/coach/CoachPanel";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Page } from "@/components/ui/Page";
import { getAiSettings } from "@/lib/ai/providers";
import { getFullConversation } from "@/lib/data/coachMessages";
import { requireUser } from "@/lib/session";

export default async function CoachPage() {
  const user = await requireUser();
  const [ai, history] = await Promise.all([
    getAiSettings(user.id),
    getFullConversation(user.id),
  ]);

  return (
    <Page title="Coach" description="Answers based on what you have logged.">
      <div className="space-y-block">
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
        <CoachPanel initial={history} />
      </div>
    </Page>
  );
}
