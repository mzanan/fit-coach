const SIZED_NAME = /^\s*([\d.,]+)\s*(g|gr|grs|gram|grams|kg|ml|l|oz)\b\s*(.*)$/i;

export function hasSizePrefix(name: string): boolean {
  return SIZED_NAME.test(name);
}

export function scaledSizeName(name: string, portions: number): string {
  const match = SIZED_NAME.exec(name);
  if (!match || portions === 1) return name;
  const amount = Number(match[1].replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return name;
  const scaled = Math.round(amount * portions * 10) / 10;
  return `${scaled}${match[2]} ${match[3]}`.trim();
}
