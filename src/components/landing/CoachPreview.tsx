import { LearnedChip } from "@/components/coach/LearnedChip";
import { Surface } from "@/components/ui/Surface";

import { COACH_EXCHANGE } from "@/lib/landingDemo";

export function CoachPreview() {
  return (
    <Surface
      level="raised"
      role="img"
      aria-label="Example coach conversation: the user asks whether to cut dinner after a high-fat lunch and the coach answers that calories are fine and protein is the gap."
      className="space-y-5"
    >
      <div className="reveal flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-primary-foreground">
          <p className="text-body leading-relaxed">{COACH_EXCHANGE.question}</p>
        </div>
      </div>
      <p className="reveal-late text-body leading-relaxed">
        {COACH_EXCHANGE.answer}
      </p>
      <div className="reveal-late">
        <LearnedChip facts={COACH_EXCHANGE.learned} />
      </div>
    </Surface>
  );
}
