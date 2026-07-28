import { MealRow } from "@/components/today/MealRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { Surface } from "@/components/ui/Surface";
import { MEAL_CATEGORIES } from "@/lib/constants";
import type { Meal } from "@/lib/db/schema";

export function MealList({ meals }: { meals: Meal[] }) {
  if (meals.length === 0) {
    return (
      <EmptyState
        title="Nothing logged yet"
        body="Add your first meal and the day fills in."
      />
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
