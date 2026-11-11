import { cn } from "@/lib/utils";

export function Collapse({
  open,
  id,
  children,
  className,
}: {
  open: boolean;
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      id={id}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-(--dur-base) ease-(--ease-out-soft)",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        className,
      )}
    >
      <div className="min-h-0 overflow-hidden" inert={open ? undefined : true}>
        {children}
      </div>
    </div>
  );
}
