export const ENTER_CLASS =
  "animate-in fade-in fill-mode-backwards duration-(--dur-reveal) ease-(--ease-out-soft) motion-reduce:animate-none";

export function staggerDelay(
  index: number,
  step: "--stagger-1" | "--stagger-dense" = "--stagger-1",
  cap = 6,
): { animationDelay: string } {
  return { animationDelay: `calc(var(${step}) * ${Math.min(index, cap)})` };
}
