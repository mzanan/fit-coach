import { formatInTimeZone } from "date-fns-tz";

import { BackupCard } from "@/components/settings/BackupCard";
import { MdImportCard } from "@/components/settings/MdImportCard";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { SignOutButton } from "@/components/settings/SignOutButton";
import { TargetsForm } from "@/components/settings/TargetsForm";
import { InbodyCard } from "@/components/settings/InbodyCard";
import { WhoopCard } from "@/components/settings/WhoopCard";
import { hasVisionAi } from "@/lib/ai/groq";
import { getWhoopConnection, hasWhoopEnv } from "@/lib/integrations/whoop";
import { ensureProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";

export default async function SettingsPage() {
  const user = await requireUser();
  const [profile, whoop] = await Promise.all([
    ensureProfile(user.id),
    getWhoopConnection(user.id),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>
      <TargetsForm profile={profile} />
      <ProfileForm profile={profile} />
      <WhoopCard
        configured={hasWhoopEnv()}
        connected={Boolean(whoop)}
        lastSyncedAt={
          whoop?.last_synced_at
            ? formatInTimeZone(
                whoop.last_synced_at,
                profile.timezone,
                "yyyy-MM-dd HH:mm",
              )
            : null
        }
      />
      <InbodyCard aiReady={hasVisionAi()} />
      <MdImportCard />
      <BackupCard />
      <SignOutButton />
    </div>
  );
}
