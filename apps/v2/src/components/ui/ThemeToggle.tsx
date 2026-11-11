"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/Button";
import { useMounted } from "@/hooks/useMounted";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const dark = resolvedTheme === "dark";

  if (!mounted) {
    return <div aria-hidden className={cn("size-11", className)} />;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className={className}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? (
        <Sun className="size-[18px]" strokeWidth={1.5} />
      ) : (
        <Moon className="size-[18px]" strokeWidth={1.5} />
      )}
    </Button>
  );
}
