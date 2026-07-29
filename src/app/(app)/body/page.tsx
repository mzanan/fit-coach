import { ScanLine } from "lucide-react";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";

import { CompositionCard } from "@/components/body/CompositionCard";
import { InbodyGuidance } from "@/components/body/InbodyGuidance";
import { IntakeSinceScan } from "@/components/body/IntakeSinceScan";
import { RecompHero } from "@/components/body/RecompHero";
import { Button } from "@/components/ui/Button";
import { Page } from "@/components/ui/Page";
import { Stat } from "@/components/ui/Stat";
import { Surface } from "@/components/ui/Surface";
import { getBodyScanOverview } from "@/lib/data/bodyScans";
import { ensureProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";

export default async function BodyPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);
  const overview = await getBodyScanOverview(user.id, profile);
  const { latest, delta, adherence, daily } = overview;

  if (!latest) {
    return (
      <Page
        width="default"
        title="Body"
        description="Body composition from your InBody scans."
      >
        <div className="space-y-7">
          <Surface
            level="sunken"
            className="mx-auto max-w-(--container-focus) px-6 py-10 text-center"
          >
            <p className="text-body">No body scan yet</p>
            <p className="mx-auto mt-1.5 max-w-[32ch] text-meta text-muted-foreground">
              Import an InBody result and this screen shows what your diet and
              training are actually doing.
            </p>
            <Button asChild className="mt-5">
              <Link href="/settings">
                <ScanLine className="size-4" strokeWidth={1.5} />
                Import a scan
              </Link>
            </Button>
          </Surface>

          {adherence ? (
            <IntakeSinceScan
              adherence={adherence}
              daily={daily}
              title="Last 14 days"
            />
          ) : null}
        </div>
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
      width="default"
      title="Body"
      description={`Scan from ${takenAt}${latest.device ? ` · ${latest.device}` : ""}`}
      action={
        <Button asChild variant="ghost" size="icon" aria-label="Import scan">
          <Link href="/settings">
            <ScanLine className="size-[18px]" strokeWidth={1.5} />
          </Link>
        </Button>
      }
    >
      <div className="space-y-7">
        <RecompHero latest={latest} delta={delta} />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Surface className="p-4">
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
          <Surface className="p-4">
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
          <Surface className="p-4">
            <Stat
              label="Visceral fat"
              value={latest.visceral_fat_level}
              hint="Healthy under 10"
            />
          </Surface>
          <Surface className="p-4">
            <Stat
              label="Waist"
              value={latest.waist_circumference_cm}
              unit="cm"
            />
          </Surface>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <CompositionCard scan={latest} />
          <InbodyGuidance scan={latest} profile={profile} />
        </div>

        {adherence ? (
          <IntakeSinceScan
            adherence={adherence}
            daily={daily}
            title={delta ? "Between scans" : "Since the scan"}
          />
        ) : null}
      </div>
    </Page>
  );
}
