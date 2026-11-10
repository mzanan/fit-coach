import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

const SIZE = {
  sm: { px: 24, text: "text-body" },
  md: { px: 28, text: "text-title" },
} as const;

export function BrandMark({
  size = "md",
  href,
  iconOnly,
  className,
}: {
  size?: keyof typeof SIZE;
  href?: string;
  iconOnly?: boolean;
  className?: string;
}) {
  const s = SIZE[size];
  const content = (
    <>
      <Image src="/icon.svg" alt="" width={s.px} height={s.px} unoptimized />
      <span
        className={cn(
          "font-medium tracking-(--tracking-snug) transition-opacity duration-(--dur-base) ease-(--ease-in-out-soft)",
          s.text,
          iconOnly && "opacity-0",
        )}
      >
        Fit Coach
      </span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "inline-flex min-h-11 items-center gap-2.5 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        {content}
      </Link>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {content}
    </span>
  );
}
