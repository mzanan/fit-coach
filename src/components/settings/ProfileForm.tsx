"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { NumberField } from "@/components/ui/NumberField";
import { Segmented } from "@/components/ui/Segmented";
import { Surface } from "@/components/ui/Surface";
import { updateProfileSettings } from "@/lib/actions/profile";
import type { Profile } from "@/lib/db/schema";
import { useAction } from "@/hooks/useAction";

export function ProfileForm({ profile }: { profile: Profile }) {
  const { pending, run } = useAction();
  const [sex, setSex] = useState(profile.sex);
  const [birthYear, setBirthYear] = useState(
    profile.birth_year ? String(profile.birth_year) : "",
  );
  const [height, setHeight] = useState(
    profile.height_cm ? String(profile.height_cm) : "",
  );
  const [timezone, setTimezone] = useState(profile.timezone);
  const [cutoff, setCutoff] = useState(String(profile.day_cutoff_hour));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    run(
      () =>
        updateProfileSettings({
          sex: sex === "female" ? "female" : "male",
          birth_year: birthYear === "" ? null : Number(birthYear),
          height_cm: height === "" ? null : Number(height),
          timezone: timezone.trim(),
          day_cutoff_hour: Number(cutoff),
        }),
      { success: "Profile saved" },
    );
  }

  return (
    <Surface className="p-4">
      <h2 className="text-sm font-semibold">Profile</h2>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <div>
          <Label>Sex</Label>
          <Segmented
            options={[
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
            ]}
            value={sex}
            onChange={setSex}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            id="birth_year"
            label="Birth year"
            value={birthYear}
            onChange={setBirthYear}
            min={1900}
            placeholder="1996"
          />
          <NumberField
            id="height_cm"
            label="Height (cm)"
            value={height}
            onChange={setHeight}
            placeholder="190"
          />
        </div>
        <div>
          <Label htmlFor="timezone">Timezone</Label>
          <Input
            id="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="Asia/Ho_Chi_Minh"
          />
        </div>
        <NumberField
          id="day_cutoff_hour"
          label="Day cutoff hour (0-12)"
          value={cutoff}
          onChange={setCutoff}
          min={0}
          step={1}
        />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Saving..." : "Save profile"}
        </Button>
      </form>
    </Surface>
  );
}
