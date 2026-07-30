import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";

export function Page({
  title,
  description,
  backHref,
  backLabel,
  action,
  children,
  className,
}: {
  title?: string;
  description?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-(--container-default) px-gutter",
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
      {children}
    </div>
  );
}
