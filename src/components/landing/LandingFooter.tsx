import { ArrowUpRight } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="hairline-t">
      <div className="mx-auto flex max-w-(--container-wide) justify-center px-gutter py-10">
        <a
          href="https://itsmatias.com"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-1.5 text-eyebrow font-medium uppercase tracking-eyebrow text-foreground transition-colors hover:text-primary"
        >
          Built by itsmatias
          <ArrowUpRight
            size={12}
            strokeWidth={1.75}
            className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </a>
      </div>
    </footer>
  );
}
