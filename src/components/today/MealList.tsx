import { MealRow } from "@/components/today/MealRow";
import { Surface } from "@/components/ui/Surface";
import { MEAL_CATEGORIES } from "@/lib/constants";
import type { Meal } from "@/lib/db/schema";

export function MealList({ meals }: { meals: Meal[] }) {
  if (meals.length === 0) {
    return (
      <Surface level="sunken" className="px-6 py-10 text-center">
        <p className="text-body text-muted-foreground">Nothing logged yet</p>
        <p className="mt-1 text-meta text-faint">
          Add your first meal and the day fills in.
        </p>
      </Surface>
    );
  }

  return (
    <div className="space-y-3.5">
      {MEAL_CATEGORIES.map((cat) => {
        const rows = meals.filter((m) => m.category === cat.key);
        if (rows.length === 0) return null;
        return (
          <Surface key={cat.key} className="px-5 pt-4 pb-1">
            <p className="eyebrow">{cat.label}</p>
            <div className="mt-1">
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
