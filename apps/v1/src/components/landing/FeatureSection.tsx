import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export function FeatureSection({
  id,
  eyebrow,
  title,
  body,
  bullets,
  reverse,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  body: string;
  bullets?: readonly string[];
  reverse?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="mx-auto grid max-w-(--container-wide) scroll-mt-nav items-center gap-block px-gutter py-section md:grid-cols-2 md:gap-10 lg:grid-cols-12"
    >
      <div
        className={cn(
          "reveal lg:col-span-5",
          reverse && "md:order-2 lg:col-start-8",
        )}
      >
        <p className="eyebrow text-brand-ink">{eyebrow}</p>
        <h2 className="mt-2.5 text-h1 font-semibold md:text-hero md:tracking-(--tracking-hero)">
          {title}
        </h2>
        <p className="mt-3 max-w-[48ch] text-body text-muted-foreground">
          {body}
        </p>
        {bullets ? (
          <ul className="mt-5 space-y-2.5 text-body">
            {bullets.map((bullet) => (
              <li key={bullet} className="flex gap-2.5">
                <Check
                  aria-hidden
                  className="mt-1 size-4 shrink-0 text-brand-ink"
                  strokeWidth={1.5}
                />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div
        className={cn(
          "reveal-late lg:col-span-6",
          reverse ? "md:order-1 lg:col-start-1 lg:row-start-1" : "lg:col-start-7",
        )}
      >
        {children}
      </div>
    </section>
  );
}
