export const DAY_MS = 86_400_000;
export const HOUR_MS = 3_600_000;
export const MIN_MS = 60_000;

export function addMinutes(d: Date, n: number): Date {
  const x = new Date(d);
  x.setTime(x.getTime() + n * MIN_MS);
  return x;
}

export function diffMinutes(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / MIN_MS);
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function toISOHour(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${mi}`;
}

export function parseISO(s: string): Date {
  if (s.includes("T")) {
    const [date, time] = s.split("T");
    const [y, m, d] = date.split("-").map(Number);
    const [h = 0, mi = 0] = time.split(":").map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1, h, mi);
  }
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function addHours(d: Date, n: number): Date {
  const x = new Date(d);
  x.setTime(x.getTime() + n * HOUR_MS);
  return x;
}

export function diffDays(a: Date, b: Date): number {
  const A = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const B = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((B - A) / DAY_MS);
}

export function diffHours(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / HOUR_MS);
}

export function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x;
}

export function startOfHour(d: Date): Date {
  const x = new Date(d);
  x.setMinutes(0, 0, 0);
  return x;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameHour(a: Date, b: Date): boolean {
  return isSameDay(a, b) && a.getHours() === b.getHours();
}

export function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function monthLabel(d: Date): string {
  return `${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
}

export function dayMonthLabel(d: Date): string {
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()].slice(0, 3).toLowerCase()}`;
}

const DAYS_ES = ["L", "M", "X", "J", "V", "S", "D"];
export function dayLetter(d: Date): string {
  return DAYS_ES[(d.getDay() + 6) % 7];
}

export function formatHuman(d: Date, includeHour = false): string {
  const base = `${d.getDate()} ${MONTHS_ES[d.getMonth()].slice(0, 3).toLowerCase()}`;
  if (!includeHour) return base;
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${base} · ${h}:${m}`;
}
