import { formatInTimeZone } from "date-fns-tz";
import { Activity, Database, FileText, ScanLine, Target, User } from "lucide-react";

import { SignOutButton } from "@/components/settings/SignOutButton";
import { ListGroup, ListRow } from "@/components/ui/ListRow";
import { PageHeader } from "@/components/ui/PageHeader";
import { getLatestScanTakenAt } from "@/lib/data/bodyScans";
import { getWhoopConnection, hasWhoopEnv } from "@/lib/integrations/whoop";
import { ensureProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";

function timezoneCity(timezone: string): string {
  const last = timezone.split("/").pop() ?? timezone;
  return last.replace(/_/g, " ");
}

export default async function SettingsPage() {
  const user = await requireUser();
  const [profile, whoop, latestScan] = await Promise.all([
    ensureProfile(user.id),
    getWhoopConnection(user.id),
    getLatestScanTakenAt(user.id),
  ]);

  const whoopConfigured = hasWhoopEnv();

  return (
    <div className="space-y-block">
      <PageHeader title="Settings" description={user.email} />

      <ListGroup
        label="Plan"
        className="animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards duration-(--dur-slow) ease-(--ease-out-soft)"
      >
        <ListRow
          href="/settings/targets"
          icon={Target}
          label="Macro targets"
          value={`${Math.round(profile.calories_target)} kcal`}
        />
        <ListRow
          href="/settings/profile"
          icon={User}
          label="Profile"
          value={timezoneCity(profile.timezone)}
        />
      </ListGroup>

      <ListGroup
        label="Data"
        className="animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards delay-(--stagger-1) duration-(--dur-slow) ease-(--ease-out-soft)"
      >
        <ListRow
          href="/settings/scan"
          icon={ScanLine}
          label="InBody scan"
          value={
            latestScan
              ? formatInTimeZone(latestScan, profile.timezone, "d MMM")
              : "No scans"
          }
        />
        <ListRow
          href="/settings/whoop"
          icon={Activity}
          label="Whoop"
          value={
            !whoopConfigured ? "Unavailable" : whoop ? "Connected" : "Not connected"
          }
        />
        <ListRow href="/settings/import" icon={FileText} label="Import from Markdown" />
        <ListRow href="/settings/backup" icon={Database} label="Backup" />
      </ListGroup>

      <ListGroup
        className="animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards delay-(--stagger-2) duration-(--dur-slow) ease-(--ease-out-soft)"
      >
        <SignOutButton />
      </ListGroup>
    </div>
  );
}
