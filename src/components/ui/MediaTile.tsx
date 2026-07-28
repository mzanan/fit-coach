import { cn } from "@/lib/utils";

export function MediaTile({
  media,
  title,
  meta,
  disabled,
  onSelect,
  index = 0,
  className,
}: {
  media?: React.ReactNode;
  title: string;
  meta?: string;
  disabled?: boolean;
  onSelect: () => void;
  index?: number;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards flex w-full flex-col overflow-hidden rounded-xl border border-hairline-strong bg-card text-left transition-colors duration-(--dur-fast) ease-(--ease-out-soft) active:bg-overlay focus-visible:bg-overlay focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
      style={{ animationDelay: `${Math.min(index, 5) * 40}ms`, animationDuration: "var(--dur-base)" }}
    >
      {media ? (
        <div className="flex aspect-media w-full items-center justify-center bg-well">{media}</div>
      ) : null}
      <div className="flex min-h-(--spacing-caption) flex-col justify-center gap-0.5 px-2.5 py-2">
        <p className="line-clamp-2 text-pretty text-body tracking-(--tracking-snug) text-foreground">
          {title}
        </p>
        {meta ? <p className="truncate text-meta text-muted-foreground">{meta}</p> : null}
      </div>
    </button>
  );
}
