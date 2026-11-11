import { Plus } from "lucide-react";

import { MacroChips } from "@/components/ui/MacroChips";
import { Pill } from "@/components/ui/Pill";
import { Surface } from "@/components/ui/Surface";

import { RECENT_MEALS } from "@/lib/landingDemo";

export function RecentsPreview() {
  return (
    <Surface
      level="raised"
      role="img"
      aria-label="Example list of recent meals with their macros, each one a tap away from being logged."
    >
      <p className="eyebrow">Recents</p>
      <ul className="mt-3 divide-y divide-hairline">
        {RECENT_MEALS.map((meal) => (
          <li key={meal.name} className="flex items-center gap-3 py-3.5 last:pb-0">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-body">
                <span className="truncate">{meal.name}</span>
                {meal.bowl ? <Pill>Bowl</Pill> : null}
              </p>
              <MacroChips macros={meal.macros} className="mt-1" />
            </div>
            <span
              aria-hidden
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-overlay text-muted-foreground"
            >
              <Plus className="size-4" strokeWidth={1.5} />
            </span>
          </li>
        ))}
      </ul>
    </Surface>
  );
}
