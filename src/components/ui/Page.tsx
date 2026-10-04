import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";

export function Page({
  title,
  description,
  backHref,
  backLabel,
  action,
  fill,
  fab,
  children,
  className,
}: {
  title?: string;
  description?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
  fill?: boolean;
  fab?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-(--container-default) animate-in fade-in px-gutter duration-(--dur-slow) ease-(--ease-out-soft)",
        fill && "flex h-full min-h-0 flex-col",
        fab && "pb-(--spacing-fab-clear) md:pb-0",
        className,
      )}
    >
      {title ? (
        <PageHeader
          title={title}
          description={description}
          backHref={backHref}
          backLabel={backLabel}
          action={action}
          className="mb-block"
        />
      ) : null}
      <div className={cn("flex flex-col gap-block", fill && "min-h-0 flex-1")}>
        {children}
      </div>
    </div>
  );
}
