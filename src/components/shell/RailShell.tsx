"use client";

import { RailContext, useRailState } from "@/components/shell/useRail";

export function RailShell({
  initialCollapsed,
  children,
}: {
  initialCollapsed: boolean;
  children: React.ReactNode;
}) {
  const rail = useRailState(initialCollapsed);

  return (
    <RailContext value={rail}>
      <div className="fixed inset-0 flex overflow-hidden">{children}</div>
    </RailContext>
  );
}
