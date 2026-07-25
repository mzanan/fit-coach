import { MealRow } from "@/components/today/MealRow";
import { Surface } from "@/components/ui/Surface";
import { MEAL_CATEGORIES } from "@/lib/constants";
import type { Meal } from "@/lib/db/schema";

export function MealList({ meals }: { meals: Meal[] }) {
  if (meals.length === 0) {
    return (
      <Surface className="p-6 text-center text-sm text-muted-foreground">
        No meals logged yet. Tap + to add one.
      </Surface>
    );
  }

  return (
    <div className="space-y-3">
      {MEAL_CATEGORIES.map((cat) => {
        const rows = meals.filter((m) => m.category === cat.key);
        if (rows.length === 0) return null;
        return (
          <Surface key={cat.key} className="px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {cat.label}
            </p>
            <div className="divide-y divide-border">
              {rows.map((m) => (
                <MealRow key={m.id} meal={m} />
              ))}
            </div>
          </Surface>
        );
      })}
    </div>
  );
}
