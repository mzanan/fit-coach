import { Pill } from "@/components/ui/Pill";
import { Surface } from "@/components/ui/Surface";

import { WORKOUT_DEMO } from "@/lib/landingDemo";

export function WorkoutPreview() {
  return (
    <Surface
      level="raised"
      role="img"
      aria-label="Example workout: single-leg press logged per side over three sets."
    >
      <div className="flex items-center gap-2">
        <p className="text-title font-medium">{WORKOUT_DEMO.title}</p>
        <Pill>Routine</Pill>
      </div>
      <Surface level="sunken" radius="lg" pad="compact" className="mt-4">
        <p className="text-body">{WORKOUT_DEMO.exercise}</p>
        <p className="eyebrow mt-1.5">Per side</p>
        <ul className="mt-3 divide-y divide-hairline">
          {WORKOUT_DEMO.sets.map((set) => (
            <li key={set.n} className="flex items-center gap-4 py-2.5 text-body">
              <span className="num w-4 text-faint">{set.n}</span>
              <span className="num">
                {set.kg} <span className="font-sans text-meta text-faint">kg</span>
              </span>
              <span className="num ml-auto text-muted-foreground">
                × {set.reps}
              </span>
            </li>
          ))}
        </ul>
      </Surface>
    </Surface>
  );
}
