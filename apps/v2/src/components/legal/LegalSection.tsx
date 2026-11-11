import type { ReactNode } from "react";

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-title font-medium">{title}</h2>
      <div className="space-y-3 text-body text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
