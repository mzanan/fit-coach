import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";

const WIDTH = {
  focus: "max-w-(--container-focus)",
  default: "max-w-(--container-default)",
  wide: "max-w-(--container-default) lg:max-w-(--container-wide)",
} as const;

export function Page({
  width = "default",
  title,
  description,
  backHref,
  backLabel,
  action,
  children,
  className,
}: {
  width?: keyof typeof WIDTH;
  title?: string;
  description?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full px-gutter", WIDTH[width], className)}>
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
