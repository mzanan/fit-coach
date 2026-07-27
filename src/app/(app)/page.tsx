import { AddMeal } from "@/components/today/AddMeal";
import { DayNav } from "@/components/today/DayNav";
import { MacroOverview } from "@/components/today/MacroOverview";
import { MealList } from "@/components/today/MealList";
import { getCatalog } from "@/lib/data/catalog";
import { getDayData } from "@/lib/data/today";
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

  const [dayData, catalog] = await Promise.all([
    getDayData(user.id, profile, day),
    getCatalog(user.id),
  ]);

  return (
    <div className="space-y-7">
      <DayNav day={day} today={today} isGymDay={dayData.isGymDay} />
      <MacroOverview summary={dayData.summary} profile={profile} />
      <MealList meals={dayData.meals} />
      <AddMeal catalog={catalog} day={day} />
    </div>
  );
}
