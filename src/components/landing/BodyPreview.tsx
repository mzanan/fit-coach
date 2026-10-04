import { Stat } from "@/components/ui/Stat";
import { Surface } from "@/components/ui/Surface";

import { BODY_DEMO } from "@/lib/landingDemo";

export function BodyPreview() {
  return (
    <Surface
      level="raised"
      role="img"
      aria-label="Example body composition since the last scan: muscle up 0.8 kg, body fat down 1.6 kg, weight down 0.4 kg."
    >
      <p className="eyebrow">Since last scan</p>
      <div className="mt-4 grid grid-cols-3 gap-4">
        {BODY_DEMO.map((stat) => (
          <Stat
            key={stat.label}
            label={stat.label}
            value={stat.value}
            unit="kg"
            delta={{ value: stat.delta, goodDirection: stat.good, unit: "kg" }}
          />
        ))}
      </div>
    </Surface>
  );
}
