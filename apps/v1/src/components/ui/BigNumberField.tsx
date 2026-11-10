import { Input, Label } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

export function BigNumberField({
  id,
  label,
  value,
  onChange,
  placeholder,
  inputMode = "decimal",
  min = 0,
  step,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: "decimal" | "numeric";
  min?: number;
  step?: number;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 flex-1", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode={inputMode}
        enterKeyHint="done"
        min={min}
        step={step}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.target.select()}
        className="num h-14 text-center text-metric"
      />
    </div>
  );
}
