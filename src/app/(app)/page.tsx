import { AddMeal } from "@/components/today/AddMeal";
import { CloseDay } from "@/components/today/CloseDay";
import { DayNav } from "@/components/today/DayNav";
import { MacroOverview } from "@/components/today/MacroOverview";
import { MealList } from "@/components/today/MealList";
import { Page } from "@/components/ui/Page";
import { ensureDay } from "@/lib/data/days";
import { getCatalog } from "@/lib/data/catalog";
import { getWeekDays } from "@/lib/data/days";
import { getDayData } from "@/lib/data/today";
import { getRecentMeals } from "@/lib/data/recentMeals";
import { dayDeviations, weeklyStepsAverage } from "@/lib/dayClose";
import { dayConfig, daysSinceMonday, shiftDay, todayLogicalDay } from "@/lib/dates";
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

  await ensureDay(user.id, profile, today);

  const monday = shiftDay(day, -daysSinceMonday(day));

  const [dayData, catalog, recents, weekDays] = await Promise.all([
    getDayData(user.id, profile, day),
    getCatalog(user.id),
    getRecentMeals(user.id),
    getWeekDays(user.id, monday, day),
  ]);

  const weeklyStepsAvg = weeklyStepsAverage(weekDays);
  const deviations = dayDeviations(dayData.summary, dayData.meals.length);

  return (
    <Page>
      <div className="space-y-7">
        <DayNav day={day} today={today} isGymDay={dayData.isGymDay} />
        <MacroOverview summary={dayData.summary} profile={profile} />
        <div className="hidden items-center gap-3 md:flex">
          <h2 className="text-title font-medium tracking-(--tracking-snug)">
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
        <CloseDay
          day={day}
          dayRow={dayData.dayRow}
          weeklyStepsAvg={weeklyStepsAvg}
          deviations={deviations}
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
      </div>
    </Page>
  );
}
