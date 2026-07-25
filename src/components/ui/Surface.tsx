import { cn } from "@/lib/utils";

export function Surface({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl bg-card", className)} {...props} />;
}
