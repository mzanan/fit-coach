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
        "hairline-t sticky bottom-(--nav-h) z-20 -mx-gutter mt-block bg-background/80 px-gutter pt-3 pb-3 backdrop-blur-xl md:bottom-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
