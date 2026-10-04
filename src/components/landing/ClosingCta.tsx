import Link from "next/link";

import { Button } from "@/components/ui/Button";

export function ClosingCta({
  ctaLabel,
  meta,
}: {
  ctaLabel: string;
  meta: string;
}) {
  return (
    <section className="mx-auto max-w-(--container-wide) px-gutter pb-section">
      <div className="reveal relative overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground md:px-10 md:py-20">
        <div aria-hidden className="bg-grid absolute inset-0 opacity-40" />
        <div className="relative">
          <p className="eyebrow text-primary-foreground/70">Free</p>
          <h2 className="mt-3 text-h1 font-semibold md:text-display md:tracking-(--tracking-hero)">
            Start with today&apos;s meals.
          </h2>
          <p className="mx-auto mt-4 max-w-[40ch] text-body text-primary-foreground/75 md:text-title md:font-normal">
            Set your targets once. The coach picks up your preferences as you
            talk.
          </p>
          <Button asChild variant="inverse" size="lg" className="mt-block">
            <Link href="/login">{ctaLabel}</Link>
          </Button>
          <p className="mt-3 text-meta text-primary-foreground/70">{meta}</p>
        </div>
      </div>
    </section>
  );
}
