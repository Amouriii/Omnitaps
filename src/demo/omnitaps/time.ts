export const MINUTE_MS = 60_000;
export const DAY_MS = 86_400_000;

const pad = (value: number) => String(value).padStart(2, "0");

/** Local calendar key, deliberately not UTC (the venue operates one clock). */
export function localDateKey(input: Date | string): string {
  const date = typeof input === "string" ? new Date(input) : input;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1, 0, 0, 0, 0);
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

export function minutesToTime(minutes: number): string {
  const normalized = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(normalized / 60))}:${pad(normalized % 60)}`;
}

export function combineDateTime(dateKey: string, time: string): Date {
  const date = parseDateKey(dateKey);
  const [hours, minutes] = time.split(":").map(Number);
  date.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return date;
}

export function isoFor(dateKey: string, time: string): string {
  return combineDateTime(dateKey, time).toISOString();
}

export function addDaysKey(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MINUTE_MS);
}

export function isSameDateKey(isoOrKey: string, dateKey: string): boolean {
  return localDateKey(isoOrKey) === dateKey;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTimeLabel(time: string): string {
  return new Date(`2000-01-01T${time}:00`).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(isoOrKey: string, withWeekday = false): string {
  const date =
    isoOrKey.length === 10 ? parseDateKey(isoOrKey) : new Date(isoOrKey);
  return date.toLocaleDateString("en-US", {
    ...(withWeekday ? { weekday: "short" as const } : {}),
    month: "short",
    day: "numeric",
  });
}

export function formatDateLong(isoOrKey: string): string {
  const date =
    isoOrKey.length === 10 ? parseDateKey(isoOrKey) : new Date(isoOrKey);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatDateParts(isoOrKey: string): { month: string; day: string; weekday: string } {
  const date =
    isoOrKey.length === 10 ? parseDateKey(isoOrKey) : new Date(isoOrKey);
  return {
    month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: String(date.getDate()),
    weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
  };
}

export function formatDayChip(isoOrKey: string): { weekday: string; day: string; month: string } {
  const date =
    isoOrKey.length === 10 ? parseDateKey(isoOrKey) : new Date(isoOrKey);
  return {
    weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
    day: String(date.getDate()),
    month: date.toLocaleDateString("en-US", { month: "short" }),
  };
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

export function formatMoney(cents: number, options?: { compact?: boolean }): string {
  if (options?.compact && cents >= 100_000) {
    return `$${(cents / 100_000).toFixed(1)}k`;
  }
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function formatRelative(iso: string, referenceIso?: string): string {
  const target = new Date(iso).getTime();
  const reference = referenceIso ? new Date(referenceIso).getTime() : Date.now();
  const diffMinutes = Math.round((target - reference) / MINUTE_MS);
  const abs = Math.abs(diffMinutes);

  if (abs < 1) return "just now";
  if (abs < 60) return diffMinutes > 0 ? `in ${abs} min` : `${abs} min ago`;
  if (abs < 1440) {
    const hours = Math.round(abs / 60);
    return diffMinutes > 0 ? `in ${hours} hr` : `${hours} hr ago`;
  }
  const days = Math.round(abs / 1440);
  return diffMinutes > 0 ? `in ${days} day${days === 1 ? "" : "s"}` : `${days} day${days === 1 ? "" : "s"} ago`;
}

export function intervalsOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
  bufferMinutes = 0,
): boolean {
  const buffer = bufferMinutes * MINUTE_MS;
  return startA < endB + buffer && endA > startB - buffer;
}

export function isPeakHour(hour: number): boolean {
  return (hour >= 12 && hour < 14) || (hour >= 18 && hour < 21);
}

/**
 * The demo runs on a service clock. During café hours it follows the real
 * clock; outside them it pins to 19:00 so "live" floors and arrivals remain
 * coherent whenever a reviewer opens the demo.
 */
export function resolveDemoMoment(now = new Date()): Date {
  const date = new Date(now);
  date.setSeconds(0, 0);
  date.setMinutes(Math.floor(date.getMinutes() / 5) * 5);
  const hour = now.getHours() + now.getMinutes() / 60;
  if (hour >= 13 && hour < 19) return date;
  const fallback = new Date(now);
  fallback.setHours(19, 0, 0, 0);
  return fallback;
}

export function dateKeyFromDemoNow(demoNowIso: string): string {
  return localDateKey(demoNowIso);
}

export function minutesFromDemoNow(demoNowIso: string, iso: string): number {
  return Math.round((new Date(iso).getTime() - new Date(demoNowIso).getTime()) / MINUTE_MS);
}
