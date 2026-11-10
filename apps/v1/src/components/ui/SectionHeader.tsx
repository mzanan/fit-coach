import { cn } from "@/lib/utils";

export function SectionHeader({
  title,
  meta,
  action,
  className,
}: {
  title: string;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-tight flex min-h-11 items-center gap-3", className)}>
      <h2 className="text-title font-semibold">{title}</h2>
      {meta ? <span className="text-meta text-faint">{meta}</span> : null}
      {action ? <div className="ml-auto">{action}</div> : null}
    </div>
  );
}
