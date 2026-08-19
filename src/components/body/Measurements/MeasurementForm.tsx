"use client";

import { useMeasurementForm } from "@/components/body/Measurements/useMeasurementForm";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Surface } from "@/components/ui/Surface";
import { cn } from "@/lib/utils";

export function MeasurementForm() {
  const {
    waist,
    setWaist,
    weight,
    setWeight,
    waistError,
    weightError,
    blurWaist,
    blurWeight,
    pending,
    submit,
  } = useMeasurementForm();

  return (
    <Surface className="p-card">
      <p className="eyebrow mb-3">Log a measurement</p>
      <form onSubmit={submit} className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="measure-waist">Waist (cm)</Label>
          <Input
            id="measure-waist"
            inputMode="decimal"
            value={waist}
            onChange={(e) => setWaist(e.target.value)}
            onBlur={blurWaist}
            placeholder="e.g. 82"
            aria-invalid={waistError ? "true" : undefined}
            className={cn(waistError && "border-destructive")}
          />
          {waistError ? (
            <p className="mt-1 text-meta text-destructive">{waistError}</p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="measure-weight">Weight (kg)</Label>
          <Input
            id="measure-weight"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            onBlur={blurWeight}
            placeholder="e.g. 78"
            aria-invalid={weightError ? "true" : undefined}
            className={cn(weightError && "border-destructive")}
          />
          {weightError ? (
            <p className="mt-1 text-meta text-destructive">{weightError}</p>
          ) : null}
        </div>
        <Button
          type="submit"
          className="col-span-2"
          disabled={pending}
        >
          {pending ? "Logging..." : "Log"}
        </Button>
      </form>
    </Surface>
  );
}
