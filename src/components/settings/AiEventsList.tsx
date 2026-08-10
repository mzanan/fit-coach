import { formatInTimeZone } from "date-fns-tz";

import { EmptyState } from "@/components/ui/EmptyState";
import { Pill } from "@/components/ui/Pill";
import { Surface } from "@/components/ui/Surface";
import type { AiEvent } from "@/lib/data/aiEvents";

const KIND_LABEL: Record<AiEvent["kind"], string> = {
  write_requested_unresolved: "Write not confirmed",
  tool_repair: "Tool call repaired",
  turn_limit_hit: "Turn limit reached",
  rate_limited: "Provider rate limit",
  cron_maintenance: "Nightly maintenance",
};

function labelFor(event: AiEvent): string {
  if (event.kind === "tool_repair" && event.detail?.startsWith("unrepairable")) {
    return "Tool call could not be repaired";
  }
  return KIND_LABEL[event.kind];
}

const KIND_TONE: Record<AiEvent["kind"], "muted" | "brand"> = {
  write_requested_unresolved: "muted",
  tool_repair: "muted",
  turn_limit_hit: "muted",
  rate_limited: "muted",
  cron_maintenance: "brand",
};

export function AiEventsList({
  events,
  timezone,
}: {
  events: AiEvent[];
  timezone: string;
}) {
  if (!events.length) {
    return (
      <EmptyState
        title="No events yet"
        body="Things worth knowing about the AI layer show up here: a rate limit, a turn cap, a tool call that needed repair."
      />
    );
  }

  return (
    <Surface radius="xl" className="divide-y divide-border overflow-hidden">
      {events.map((event) => (
        <div key={event.id} className="flex items-start gap-3 px-card py-3.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Pill tone={KIND_TONE[event.kind]}>{labelFor(event)}</Pill>
              {event.model ? (
                <span className="truncate text-meta text-muted-foreground">
                  {event.model}
                </span>
              ) : null}
            </div>
            {event.detail ? (
              <p className="mt-1 truncate text-meta text-muted-foreground">
                {event.detail}
              </p>
            ) : null}
          </div>
          <span className="shrink-0 text-meta text-muted-foreground">
            {formatInTimeZone(event.created_at, timezone, "d MMM, HH:mm")}
          </span>
        </div>
      ))}
    </Surface>
  );
}
