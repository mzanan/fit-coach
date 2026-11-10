export function historicalCreatedAt(day: string, index: number): Date {
  return new Date(Date.parse(`${day}T12:00:00Z`) + index * 1000);
}
