import { RoutineScreen } from "@/components/routine/RoutineScreen";
import { Page } from "@/components/ui/Page";
import { listRoutineExercises, listSlots } from "@/lib/data/routine";
import { dayConfig, todayLogicalDay, weekdayOf } from "@/lib/dates";
import { ensureProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";

export default async function RoutinePage() {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);
  const day = todayLogicalDay(dayConfig(profile));
  const todayWeekday = weekdayOf(day);

  const slots = await listSlots(user.id);
  const labels = [...new Set(slots.map((s) => s.label))];
  const exercisesByLabel = Object.fromEntries(
    await Promise.all(
      labels.map(
        async (label) =>
          [label, await listRoutineExercises(user.id, label)] as const,
      ),
    ),
  );

  return (
    <Page
      title="Routine"
      description="Weekly split and progression targets"
    >
      <RoutineScreen
        slots={slots}
        exercisesByLabel={exercisesByLabel}
        todayWeekday={todayWeekday}
      />
    </Page>
  );
}
