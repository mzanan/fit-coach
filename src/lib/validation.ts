import { z } from "zod";

import {
  COMPONENT_GROUPS,
  MEASUREMENT_VALUE_MAX,
  type ComponentGroup,
} from "@/lib/constants";

export const dayString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const fatQuality = z.enum(["clean", "oily"]).nullable();
export const macroNumber = z.number().min(0).max(2000);
export const measurementValue = z.number().positive().max(MEASUREMENT_VALUE_MAX);
export const componentGroup = z.enum(
  COMPONENT_GROUPS.map((g) => g.key) as [ComponentGroup, ...ComponentGroup[]],
);

export const macroFields = {
  protein_g: macroNumber,
  fat_g: macroNumber,
  carbs_g: macroNumber,
};

export const optionalMacroFields = {
  protein_g: macroNumber.nullish(),
  fat_g: macroNumber.nullish(),
  carbs_g: macroNumber.nullish(),
};
