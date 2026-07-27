import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-background/80 px-5 backdrop-blur-xl md:px-8">
      <span className="text-title font-medium tracking-[--tracking-snug] md:hidden">
        Fit Coach
      </span>
      <span className="hidden md:block" />
      <ThemeToggle className="-mr-2" />
    </header>
  );
}
