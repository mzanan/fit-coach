import Link from "next/link";

import { BrandMark } from "@/components/ui/BrandMark";

const LINK =
  "inline-flex min-h-11 items-center underline-offset-4 transition-colors duration-(--dur-fast) hover:text-foreground";

export function LandingFooter({ year }: { year: number }) {
  return (
    <footer className="hairline-t">
      <div className="mx-auto flex max-w-(--container-wide) flex-col gap-2 px-gutter py-block text-meta text-muted-foreground md:flex-row md:items-center md:justify-between">
        <BrandMark size="sm" className="text-foreground" />
        <p>
          A free personal project by{" "}
          <a href="https://itsmatias.com" className={`${LINK} underline`}>
            Matias Zanan
          </a>
          .
        </p>
        <Link href="/login" className={LINK}>
          Sign in
        </Link>
        <p>© {year} Matias Zanan</p>
      </div>
    </footer>
  );
}
