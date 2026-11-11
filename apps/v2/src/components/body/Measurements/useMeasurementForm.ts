"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useAction } from "@/hooks/useAction";
import { logMeasurements } from "@/lib/actions/bodyMeasurements";
import { validateMeasurementInput } from "@/lib/measurementValidation";

export function useMeasurementForm() {
  const [waist, setWaist] = useState("");
  const [weight, setWeight] = useState("");
  const [waistError, setWaistError] = useState<string | null>(null);
  const [weightError, setWeightError] = useState<string | null>(null);
  const { pending, run } = useAction();

  function blurWaist() {
    setWaistError(validateMeasurementInput(waist));
  }

  function blurWeight() {
    setWeightError(validateMeasurementInput(weight));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const wErr = validateMeasurementInput(waist);
    const kErr = validateMeasurementInput(weight);
    setWaistError(wErr);
    setWeightError(kErr);
    if (wErr || kErr) return;
    if (!waist.trim() && !weight.trim()) {
      setWaistError("Enter at least one measurement");
      return;
    }

    run(
      () =>
        logMeasurements({
          waist: waist.trim() ? Number(waist) : null,
          weight: weight.trim() ? Number(weight) : null,
        }),
      {
        onDone: (result) => {
          if (result.error) {
            toast.error(result.error);
            return;
          }
          toast.success("Logged");
          setWaist("");
          setWeight("");
        },
      },
    );
  }

  return {
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
  };
}
