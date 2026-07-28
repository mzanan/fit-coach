import { DeleteWorkoutButton } from "@/components/workout/DeleteWorkoutButton";
import { WorkoutScreen } from "@/components/workout/WorkoutScreen";
import { PageHeader } from "@/components/ui/PageHeader";
import { getWorkoutForDay, getWorkoutHistory } from "@/lib/data/workouts";
import { DEFAULT_SPLIT } from "@/lib/constants";
import { dayConfig, formatDayLabel, todayLogicalDay } from "@/lib/dates";
import { ensureProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";

export default async function WorkoutPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);
  const day = todayLogicalDay(dayConfig(profile));

  const [workout, historyResult] = await Promise.all([
    getWorkoutForDay(user.id, day),
    getWorkoutHistory(user.id, day).then(
      (value) => ({ ok: true as const, value }),
      () => ({ ok: false as const, value: null }),
    ),
  ]);
  const historyAvailable = historyResult.ok;
  const history = historyResult.value ?? { lastByName: {}, names: [], lastLabel: null };

  const lastIndex = history.lastLabel
    ? DEFAULT_SPLIT.findIndex((s) => s === history.lastLabel)
    : -1;
  const suggestedSplit =
    lastIndex === -1
      ? DEFAULT_SPLIT[0]
      : DEFAULT_SPLIT[(lastIndex + 1) % DEFAULT_SPLIT.length];

  const setCount = workout
    ? workout.exercises.reduce((n, ex) => n + ex.sets.length, 0)
    : 0;

  return (
    <div className="space-y-block">
      <PageHeader
        title="Workout"
        description={
          workout
            ? `${formatDayLabel(day, day)} · ${workout.label ?? "Session"}${
                setCount > 0 ? ` · ${setCount} sets` : ""
              }`
            : formatDayLabel(day, day)
        }
        action={workout ? <DeleteWorkoutButton workoutId={workout.id} /> : null}
      />
      <WorkoutScreen
        workout={workout}
        day={day}
        history={history}
        historyAvailable={historyAvailable}
        suggestedSplit={suggestedSplit}
      />
    </div>
  );
}
