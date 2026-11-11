import { ScanLine } from "lucide-react";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";

import { CompositionCard } from "@/components/body/CompositionCard";
import { InbodyGuidance } from "@/components/body/InbodyGuidance";
import { IntakeSinceScan } from "@/components/body/IntakeSinceScan";
import { Measurements } from "@/components/body/Measurements/Measurements";
import { RecompHero } from "@/components/body/RecompHero";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Page } from "@/components/ui/Page";
import { Stat } from "@/components/ui/Stat";
import { Surface } from "@/components/ui/Surface";
import { listMeasurements } from "@/lib/data/bodyMeasurements";
import { getBodyScanOverview } from "@/lib/data/bodyScans";
import { dayConfig, todayLogicalDay } from "@/lib/dates";
import { ensureProfile } from "@/lib/profile";
import { getUpcomingReminders } from "@/lib/reminders";
import { requireUser } from "@/lib/session";
import { targetsOf } from "@/lib/targets";

const MEASUREMENTS_HISTORY_LIMIT = 20;

export default async function BodyPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);
  const cfg = dayConfig(profile);
  const today = todayLogicalDay(cfg);
  const [overview, waistEntries, weightEntries, reminders] = await Promise.all([
    getBodyScanOverview(user.id, profile),
    listMeasurements(user.id, MEASUREMENTS_HISTORY_LIMIT, "waist"),
    listMeasurements(user.id, MEASUREMENTS_HISTORY_LIMIT, "weight"),
    getUpcomingReminders(user.id, cfg, today),
  ]);
  const measurements = [...waistEntries, ...weightEntries].sort((a, b) =>
    b.logical_day.localeCompare(a.logical_day),
  );
  const { latest, delta, adherence, daily } = overview;

  if (!latest) {
    return (
      <Page title="Body" description="Body composition from your InBody scans.">
        <EmptyState
          icon={ScanLine}
          title="No body scan yet"
          body="Import an InBody result and this screen shows what your diet and training are actually doing."
          action={
            <Button asChild>
              <Link href="/settings/scan">
                <ScanLine className="size-4" strokeWidth={1.5} />
                Import a scan
              </Link>
            </Button>
          }
        />

        {adherence ? (
          <IntakeSinceScan
            adherence={adherence}
            daily={daily}
            title="Last 14 days"
          />
        ) : null}

        <Measurements
          entries={measurements}
          reminders={reminders}
          today={today}
        />
      </Page>
    );
  }

  const takenAt = formatInTimeZone(
    latest.taken_at,
    profile.timezone,
    "d MMM yyyy",
  );

  return (
    <Page
      title="Body"
      description={`Scan from ${takenAt}${latest.device ? ` · ${latest.device}` : ""}`}
      action={
        <Button asChild variant="ghost" size="icon" aria-label="Import scan">
          <Link href="/settings/scan">
            <ScanLine className="size-[18px]" strokeWidth={1.5} />
          </Link>
        </Button>
      }
    >
      <RecompHero latest={latest} delta={delta} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Surface pad="compact">
          <Stat
            label="Skeletal muscle"
            value={latest.skeletal_muscle_kg}
            unit="kg"
            delta={
              delta?.skeletal_muscle_kg != null
                ? {
                    value: delta.skeletal_muscle_kg,
                    goodDirection: "up",
                    unit: "kg",
                  }
                : undefined
            }
          />
        </Surface>
        <Surface pad="compact">
          <Stat
            label="Body fat"
            value={latest.body_fat_kg}
            unit="kg"
            delta={
              delta?.body_fat_kg != null
                ? {
                    value: delta.body_fat_kg,
                    goodDirection: "down",
                    unit: "kg",
                  }
                : undefined
            }
          />
        </Surface>
        <Surface pad="compact">
          <Stat
            label="Visceral fat"
            value={latest.visceral_fat_level}
            hint="Healthy under 10"
          />
        </Surface>
        <Surface pad="compact">
          <Stat label="Waist" value={latest.waist_circumference_cm} unit="cm" />
        </Surface>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <CompositionCard scan={latest} />
        <InbodyGuidance scan={latest} targets={targetsOf(profile)} />
      </div>

      {adherence ? (
        <IntakeSinceScan
          adherence={adherence}
          daily={daily}
          title={delta ? "Between scans" : "Since the scan"}
        />
      ) : null}

      <Measurements
        entries={measurements}
        reminders={reminders}
        today={today}
      />
    </Page>
  );
}
