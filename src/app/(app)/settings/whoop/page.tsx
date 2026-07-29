import { formatInTimeZone } from "date-fns-tz";

import { Page } from "@/components/ui/Page";
import { WhoopCard } from "@/components/settings/WhoopCard";
import { getWhoopConnection, hasWhoopEnv } from "@/lib/integrations/whoop";
import { ensureProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";

export default async function WhoopSettingsPage() {
  const user = await requireUser();
  const [profile, whoop] = await Promise.all([
    ensureProfile(user.id),
    getWhoopConnection(user.id),
  ]);

  return (
    <Page
      width="focus"
      backHref="/settings"
      backLabel="Back to settings"
      title="Whoop"
      description="Recovery, sleep, strain and workouts from your band."
    >
      <WhoopCard
        configured={hasWhoopEnv()}
        connected={Boolean(whoop)}
        lastSyncedAt={
          whoop?.last_synced_at
            ? formatInTimeZone(whoop.last_synced_at, profile.timezone, "yyyy-MM-dd HH:mm")
            : null
        }
      />
    </Page>
  );
}
