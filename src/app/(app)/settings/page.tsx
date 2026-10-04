import { formatInTimeZone } from "date-fns-tz";
import {
  CalendarDays,
  Database,
  FileText,
  MessageCircle,
  ScanLine,
  Sparkles,
  Target,
  User,
  UtensilsCrossed,
} from "lucide-react";

import { AnalyticsConsentRow } from "@/components/settings/AnalyticsConsentRow";
import { PushSubscribeRow } from "@/components/settings/PushSubscribeRow";
import { SignOutButton } from "@/components/settings/SignOutButton";
import { ListGroup, ListRow } from "@/components/ui/ListRow";
import { Page } from "@/components/ui/Page";
import { getAiSettings } from "@/lib/ai/aiCredentials";
import { getLatestScanTakenAt } from "@/lib/data/bodyScans";
import { ensureProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";
import { targetsOf } from "@/lib/targets";

function timezoneCity(timezone: string): string {
  const last = timezone.split("/").pop() ?? timezone;
  return last.replace(/_/g, " ");
}

export default async function SettingsPage() {
  const user = await requireUser();
  const [profile, latestScan, ai] = await Promise.all([
    ensureProfile(user.id),
    getLatestScanTakenAt(user.id),
    getAiSettings(user.id),
  ]);

  const targets = targetsOf(profile);

  return (
    <Page title="Settings" description={user.email}>
      <ListGroup label="Library" enterIndex={0}>
        <ListRow href="/catalog" icon={UtensilsCrossed} label="Saved meals" />
        <ListRow href="/routine" icon={CalendarDays} label="Weekly routine" />
      </ListGroup>

      <ListGroup label="Plan" enterIndex={1}>
        <ListRow
          href="/settings/targets"
          icon={Target}
          label="Macro targets"
          value={targets ? `${Math.round(targets.calories_target)} kcal` : "Not set"}
        />
        <ListRow
          href="/settings/profile"
          icon={User}
          label="Profile"
          value={timezoneCity(profile.timezone)}
          hint="Body data and when your day rolls over"
        />
      </ListGroup>

      <ListGroup label="Coach" enterIndex={2}>
        <ListRow
          href="/settings/ai"
          icon={Sparkles}
          label="AI model"
          value={ai ? ai.model.split("/").pop() : "Not configured"}
        />
        <ListRow
          href="/settings/coach"
          icon={MessageCircle}
          label="Coach rules"
          value={profile.coach_rules ? "Yours" : "Built-in"}
          hint="Method, kitchen, language, weekly summary"
        />
        <ListRow
          href="/settings/import"
          icon={FileText}
          label="Import from Markdown"
          hint="Turn notes into meals, workouts and rules"
        />
      </ListGroup>

      <ListGroup label="Data" enterIndex={3}>
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
          href="/settings/backup"
          icon={Database}
          label="Backup"
          hint="Export or restore everything"
        />
      </ListGroup>

      <PushSubscribeRow />

      <AnalyticsConsentRow />

      <ListGroup enterIndex={5}>
        <SignOutButton />
      </ListGroup>
    </Page>
  );
}
