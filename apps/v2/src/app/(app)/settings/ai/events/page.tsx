import { AiEventsList } from "@/components/settings/AiEventsList";
import { Page } from "@/components/ui/Page";
import { recentAiEvents } from "@/lib/data/aiEvents";
import { ensureProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";

export default async function AiEventsPage() {
  const user = await requireUser();
  const [profile, events] = await Promise.all([
    ensureProfile(user.id),
    recentAiEvents(user.id),
  ]);

  return (
    <Page
      backHref="/settings/ai"
      backLabel="Back to AI"
      title="Activity"
      description="What the AI layer did behind the scenes, most recent first."
    >
      <AiEventsList events={events} timezone={profile.timezone} />
    </Page>
  );
}
