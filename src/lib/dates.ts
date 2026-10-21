export function dateNumber(value: string): number {
  return Date.parse(`${value}T00:00:00Z`) / 86400000;
}
export function addDays(value: string, days: number): string {
  return new Date((dateNumber(value) + days) * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function monthNumber(value: string): number {
  const [year, month] = value.split("-").map(Number);
  return year * 12 + month - 1;
}
export function addMonths(value: string, amount: number): string {
  const index = monthNumber(value) + amount;
  return `${String(Math.floor(index / 12)).padStart(4, "0")}-${String((index % 12) + 1).padStart(2, "0")}`;
}
export function monthCount(start: string, end: string): number {
  return monthNumber(end) - monthNumber(start) + 1;
}
export function monthsBetween(start: string, end: string): string[] {
  return Array.from(
    { length: Math.max(0, monthCount(start, end)) },
    (_, index) => addMonths(start, index),
  );
}
export function monthEnd(month: string): string {
  return addDays(`${addMonths(month, 1)}-01`, -1);
}
export function monthWeeks(month: string, weekStartsOn: number): string[][] {
  const start = `${month}-01`;
  const offset =
    (new Date(`${start}T00:00:00Z`).getUTCDay() - weekStartsOn + 7) % 7;
  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, day) =>
      addDays(start, week * 7 + day - offset),
    ),
  );
}
export function monthLabel(month: string, locale = "en-GB"): string {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));
}
export function weekdayLabels(
  weekStartsOn: number,
  locale = "en-GB",
): string[] {
  return Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" })
      .format(new Date(Date.UTC(2024, 0, 7 + ((weekStartsOn + index) % 7))))
      .replace(".", ""),
  );
}
export function clampMonth(month: string): string {
  return month < "0001-01" ? "0001-01" : month > "9999-12" ? "9999-12" : month;
}
