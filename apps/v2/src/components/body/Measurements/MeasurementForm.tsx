"use client";

import { useMeasurementForm } from "@/components/body/Measurements/useMeasurementForm";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Surface } from "@/components/ui/Surface";

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
    <Surface>
      <p className="eyebrow mb-3">Log a measurement</p>
      <form onSubmit={submit} className="grid grid-cols-2 gap-3">
        <Field id="measure-waist" label="Waist (cm)" error={waistError ?? undefined}>
          <Input
            id="measure-waist"
            inputMode="decimal"
            value={waist}
            onChange={(e) => setWaist(e.target.value)}
            onBlur={blurWaist}
            placeholder="e.g. 82"
            aria-invalid={waistError ? true : undefined}
            aria-describedby={waistError ? "measure-waist-error" : undefined}
          />
        </Field>
        <Field id="measure-weight" label="Weight (kg)" error={weightError ?? undefined}>
          <Input
            id="measure-weight"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            onBlur={blurWeight}
            placeholder="e.g. 78"
            aria-invalid={weightError ? true : undefined}
            aria-describedby={weightError ? "measure-weight-error" : undefined}
          />
        </Field>
        <Button type="submit" className="col-span-2" pending={pending}>
          Log measurement
        </Button>
      </form>
    </Surface>
  );
}
