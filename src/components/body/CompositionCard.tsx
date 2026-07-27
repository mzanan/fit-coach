import { StackedBar } from "@/components/ui/StackedBar";
import { Surface } from "@/components/ui/Surface";
import type { BodyScan } from "@/lib/db/schema";

export function CompositionCard({ scan }: { scan: BodyScan }) {
  const fat = scan.body_fat_kg;
  const muscle = scan.skeletal_muscle_kg;
  const lean = scan.fat_free_mass_kg;

  const usable = fat != null && lean != null && muscle != null;

  return (
    <Surface className="p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-title font-medium tracking-[--tracking-snug]">
          Composition
        </h2>
        {scan.weight_kg != null ? (
          <span className="text-meta text-faint">
            <span className="num">{scan.weight_kg}</span> kg total
          </span>
        ) : null}
      </div>

      <div className="mt-4">
        {usable ? (
          <StackedBar
            unit="kg"
            ariaLabel={`Body composition: ${fat} kilograms of fat, ${muscle} of skeletal muscle and ${Math.round((lean - muscle) * 10) / 10} of other lean mass`}
            segments={[
              { label: "Fat mass", value: fat, className: "bg-macro-fat" },
              {
                label: "Skeletal muscle",
                value: muscle,
                className: "bg-macro-protein",
              },
              {
                label: "Other lean",
                value: Math.round((lean - muscle) * 10) / 10,
                className: "bg-macro-carbs",
              },
            ]}
          />
        ) : (
          <p className="text-meta text-muted-foreground">
            Not enough values on this scan.
          </p>
        )}
      </div>
    </Surface>
  );
}
