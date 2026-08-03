import { cn } from "@/lib/utils";

export function StickyActions({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "hairline-t sticky bottom-0 z-20 -mx-gutter -mb-6 mt-block bg-background/80 px-gutter pt-3 pb-9 backdrop-blur-xl md:-mb-gutter md:pb-[calc(var(--gutter)+--spacing(3))]",
        className,
      )}
    >
      {children}
    </div>
  );
}
