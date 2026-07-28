import { Surface } from "@/components/ui/Surface";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  body,
  action,
  size = "md",
  className,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
  size?: "md" | "sm";
  className?: string;
}) {
  return (
    <Surface
      level="sunken"
      role="status"
      className={cn(
        "text-center",
        size === "md" ? "px-6 py-10" : "px-5 py-8",
        className,
      )}
    >
      <p className="text-body">{title}</p>
      {body ? (
        <p className="mx-auto mt-1.5 max-w-[32ch] text-meta text-muted-foreground">
          {body}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </Surface>
  );
}
