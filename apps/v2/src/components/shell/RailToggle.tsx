"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { useRail } from "@/components/shell/useRail";
import { Button } from "@/components/ui/Button";

export function RailToggle({ className }: { className?: string }) {
  const { collapsed, toggle } = useRail();
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={collapsed ? "Expand menu" : "Collapse menu"}
      aria-expanded={!collapsed}
      className={className}
      onClick={toggle}
    >
      <Icon className="size-[18px]" strokeWidth={1.5} />
    </Button>
  );
}
