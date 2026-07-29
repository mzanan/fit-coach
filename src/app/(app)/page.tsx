import { AddMeal } from "@/components/today/AddMeal";
import { DayNav } from "@/components/today/DayNav";
import { MacroOverview } from "@/components/today/MacroOverview";
import { MealList } from "@/components/today/MealList";
import { Page } from "@/components/ui/Page";
import { TwoColumnSection } from "@/components/ui/TwoColumnSection";
import { getCatalog } from "@/lib/data/catalog";
import { getDayData } from "@/lib/data/today";
import { getRecentMeals } from "@/lib/data/recentMeals";
import { dayConfig, todayLogicalDay } from "@/lib/dates";
import { ensureProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);
  const cfg = dayConfig(profile);
  const today = todayLogicalDay(cfg);

  const sp = await searchParams;
  const day = sp.day && DAY_RE.test(sp.day) ? sp.day : today;

  const [dayData, catalog, recents] = await Promise.all([
    getDayData(user.id, profile, day),
    getCatalog(user.id),
    getRecentMeals(user.id),
  ]);

  return (
    <Page width="wide">
      <TwoColumnSection
        gap={8}
        leftSpan={5}
        leftSticky
        left={
          <div className="space-y-7">
            <DayNav day={day} today={today} isGymDay={dayData.isGymDay} />
            <MacroOverview summary={dayData.summary} profile={profile} />
          </div>
        }
        rightSpan={7}
        right={
          <>
            <div className="mb-3 hidden items-center gap-3 md:flex">
              <h2 className="text-title font-medium tracking-(--tracking-snug) md:text-title-lg">
                Meals
              </h2>
              <div className="ml-auto">
                <AddMeal
                  catalog={catalog}
                  recents={recents}
                  day={day}
                  today={today}
                  cfg={cfg}
                  isGymDay={dayData.isGymDay}
                  variant="inline"
                />
              </div>
            </div>
            <MealList meals={dayData.meals} />
          </>
        }
      />

      <AddMeal
        catalog={catalog}
        recents={recents}
        day={day}
        today={today}
        cfg={cfg}
        isGymDay={dayData.isGymDay}
        variant="fab"
      />
    </Page>
  );
}
