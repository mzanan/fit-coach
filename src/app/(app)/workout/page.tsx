import { WorkoutScreen } from "@/components/workout/WorkoutScreen";
import { getWorkoutForDay } from "@/lib/data/workouts";
import { dayConfig, formatDayLabel, todayLogicalDay } from "@/lib/dates";
import { ensureProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";

export default async function WorkoutPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);
  const day = todayLogicalDay(dayConfig(profile));
  const workout = await getWorkoutForDay(user.id, day);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Workout</h1>
        <p className="text-sm text-muted-foreground">
          {formatDayLabel(day, day)}
        </p>
      </div>
      <WorkoutScreen workout={workout} day={day} />
    </div>
  );
}
