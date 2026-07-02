import { z } from "zod";

export const dayString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const fatQuality = z.enum(["clean", "oily"]).nullable();
export const macroNumber = z.number().min(0).max(2000);

export const macroFields = {
  protein_g: macroNumber,
  fat_g: macroNumber,
  carbs_g: macroNumber,
};
