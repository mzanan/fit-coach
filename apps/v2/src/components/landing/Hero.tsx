import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { ENTER_CLASS } from "@/lib/motion";

import { MacroPreview } from "./MacroPreview";

const RISE = `slide-in-from-bottom-2 ${ENTER_CLASS}`;

export function Hero({ ctaLabel, meta }: { ctaLabel: string; meta: string }) {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="bg-grid absolute inset-0" />
      <div className="relative mx-auto grid max-w-(--container-wide) items-center gap-block px-gutter pt-12 pb-section md:pt-section lg:grid-cols-12">
        <div className="lg:col-span-6">
          <Pill tone="brand" className={RISE}>
            AI nutrition and strength coach
          </Pill>
          <h1
            className={`mt-5 text-hero font-semibold tracking-(--tracking-hero) lg:text-display delay-(--stagger-2) ${RISE}`}
          >
            Macro tracking with an AI coach that{" "}
            <span className="text-brand-ink">remembers.</span>
          </h1>
          <p
            className={`mt-4 max-w-[44ch] text-body text-muted-foreground md:text-title md:font-normal delay-(--stagger-4) ${RISE}`}
          >
            Log a meal in a few taps, see exactly what is left for the day, and
            ask a coach that knows your history. Built for your phone, installs
            like an app.
          </p>
          <div className={`mt-block delay-(--stagger-6) ${RISE}`}>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/login">{ctaLabel}</Link>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <a href="#features">See how it works</a>
              </Button>
            </div>
            <p className="mt-3 text-meta text-muted-foreground">{meta}</p>
          </div>
        </div>
        <div className="relative lg:col-span-5 lg:col-start-8">
          <div aria-hidden className="hero-glow absolute -inset-16" />
          <MacroPreview
            className={`relative slide-in-from-bottom-4 delay-(--stagger-8) ${ENTER_CLASS}`}
          />
        </div>
      </div>
    </section>
  );
}
