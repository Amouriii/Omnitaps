import { SERVICES, ZONE_LABELS } from "./constants";
import {
  addDaysKey,
  formatDate,
  formatTimeLabel,
  localDateKey,
  minutesToTime,
} from "./time";
import { getWaitlistMatches, isBlockingStatus, reservationsOnDate } from "./smart";
import type {
  DemoMetrics,
  DemoState,
  HeatmapData,
  PeakHourPoint,
  Reservation,
  ServiceMixPoint,
  TrendPoint,
  ZoneId,
  ZoneUtilizationPoint,
} from "./types";

const FINAL_STATUSES = new Set(["completed", "no_show", "cancelled"]);
const REVENUE_STATUSES = new Set(["confirmed", "checked_in", "seated", "completed"]);

function lastNDates(todayKey: string, days: number): string[] {
  return Array.from({ length: days }, (_, index) =>
    addDaysKey(todayKey, -(days - 1 - index)),
  );
}

function inLastDays(iso: string, todayKey: string, days: number): boolean {
  const key = localDateKey(iso);
  const first = addDaysKey(todayKey, -(days - 1));
  return key >= first && key <= todayKey;
}

function heldTableIdsNow(state: DemoState): Set<string> {
  const now = new Date(state.demoNow).getTime();
  const held = new Set<string>();
  for (const reservation of state.reservations) {
    if (!isBlockingStatus(reservation.status)) continue;
    const start = new Date(reservation.startTime).getTime();
    const end = new Date(reservation.endTime).getTime();
    if (start <= now && end > now) {
      reservation.tableIds.forEach((id) => held.add(id));
    }
  }
  return held;
}

export function computeMetrics(state: DemoState): DemoMetrics {
  const todayKey = localDateKey(state.demoNow);
  const todays = reservationsOnDate(state.reservations, todayKey);
  const now = new Date(state.demoNow).getTime();
  const activeTables = state.tables.filter(
    (table) => table.isActive && table.status !== "maintenance",
  );
  const held = heldTableIdsNow(state).size;

  const bookedToday = todays.filter(
    (reservation) => !["cancelled", "waitlisted"].includes(reservation.status),
  );
  const guestsToday = bookedToday.reduce((sum, reservation) => sum + reservation.partySize, 0);
  const waitlist = state.waitlist.filter((entry) => entry.status === "waiting");
  const matches = getWaitlistMatches(state);

  const recentPast = state.reservations.filter(
    (reservation) =>
      inLastDays(reservation.startTime, todayKey, 14) &&
      new Date(reservation.startTime).getTime() < now &&
      reservation.status !== "waitlisted",
  );
  const finalized = recentPast.filter((reservation) => FINAL_STATUSES.has(reservation.status));
  const noShows = finalized.filter((reservation) => reservation.status === "no_show").length;
  const cancellations = finalized.filter((reservation) => reservation.status === "cancelled").length;

  const revenueTodayCents = bookedToday
    .filter((reservation) => REVENUE_STATUSES.has(reservation.status))
    .reduce((sum, reservation) => sum + reservation.totalCents, 0);
  const collectedTodayCents = bookedToday
    .filter((reservation) => reservation.status === "completed")
    .reduce((sum, reservation) => sum + reservation.totalCents, 0);

  return {
    bookingsToday: bookedToday.length,
    guestsToday,
    liveOccupancy: activeTables.length ? held / activeTables.length : 0,
    activeTables: activeTables.length,
    heldTables: held,
    activeCheckIns: todays.filter((reservation) => ["checked_in", "seated"].includes(reservation.status))
      .length,
    waitlistCount: waitlist.length,
    waitlistMatches: matches.length,
    noShowRate: finalized.length ? noShows / finalized.length : 0,
    cancellationRate: finalized.length ? cancellations / finalized.length : 0,
    revenueTodayCents,
    collectedTodayCents,
    avgPartySize: bookedToday.length ? guestsToday / bookedToday.length : 0,
    pendingToday: todays.filter((reservation) => reservation.status === "pending").length,
    upcomingTwoHours: todays.filter((reservation) => {
      const start = new Date(reservation.startTime).getTime();
      return (
        ["confirmed", "pending"].includes(reservation.status) &&
        start >= now &&
        start <= now + 2 * 60 * 60_000
      );
    }).length,
  };
}

export function bookingTrend(state: DemoState, days = 14): TrendPoint[] {
  const todayKey = localDateKey(state.demoNow);
  return lastNDates(todayKey, days).map((dateKey) => {
    const reservations = reservationsOnDate(state.reservations, dateKey).filter(
      (reservation) => !["cancelled", "waitlisted"].includes(reservation.status),
    );
    return {
      dateKey,
      label: formatDate(dateKey, true),
      bookings: reservations.length,
      guests: reservations.reduce((sum, reservation) => sum + reservation.partySize, 0),
      revenueCents: reservations
        .filter((reservation) => REVENUE_STATUSES.has(reservation.status))
        .reduce((sum, reservation) => sum + reservation.totalCents, 0),
    };
  });
}

export function peakHours(state: DemoState, days = 7): PeakHourPoint[] {
  const todayKey = localDateKey(state.demoNow);
  const relevant = state.reservations.filter(
    (reservation) =>
      inLastDays(reservation.startTime, todayKey, days) &&
      !["cancelled", "waitlisted"].includes(reservation.status),
  );
  return Array.from({ length: 14 }, (_, index) => 9 + index).map((hour) => {
    const atHour = relevant.filter((reservation) => new Date(reservation.startTime).getHours() === hour);
    return {
      hour,
      label: formatTimeLabel(minutesToTime(hour * 60)),
      bookings: atHour.length,
      covers: atHour.reduce((sum, reservation) => sum + reservation.partySize, 0),
    };
  });
}

export function bookingHeatmap(state: DemoState, days = 7): HeatmapData {
  const todayKey = localDateKey(state.demoNow);
  const dayKeys = lastNDates(todayKey, days);
  const hours = Array.from({ length: 12 }, (_, index) => 11 + index);
  const relevant = state.reservations.filter(
    (reservation) =>
      inLastDays(reservation.startTime, todayKey, days) &&
      !["cancelled", "waitlisted"].includes(reservation.status),
  );
  const cells = dayKeys.flatMap((dayKey) => {
    const dayReservations = relevant.filter(
      (reservation) => localDateKey(reservation.startTime) === dayKey,
    );
    return hours.map((hour) => ({
      dayKey,
      dayLabel: formatDate(dayKey, true),
      hour,
      count: dayReservations.filter(
        (reservation) => new Date(reservation.startTime).getHours() === hour,
      ).length,
    }));
  });
  return {
    hours,
    cells,
    max: Math.max(1, ...cells.map((cell) => cell.count)),
  };
}

export function serviceMix(state: DemoState, days = 14): ServiceMixPoint[] {
  const todayKey = localDateKey(state.demoNow);
  const relevant = state.reservations.filter(
    (reservation) =>
      inLastDays(reservation.startTime, todayKey, days) &&
      !["cancelled", "waitlisted"].includes(reservation.status),
  );
  const total = Math.max(relevant.length, 1);
  return SERVICES.map((service) => {
    const matches = relevant.filter((reservation) => reservation.serviceId === service.id);
    return {
      serviceId: service.id,
      name: service.name,
      count: matches.length,
      covers: matches.reduce((sum, reservation) => sum + reservation.partySize, 0),
      share: matches.length / total,
      accent: service.accent,
    };
  }).sort((a, b) => b.count - a.count);
}

export function zoneUtilization(state: DemoState): ZoneUtilizationPoint[] {
  const held = heldTableIdsNow(state);
  return (Object.keys(ZONE_LABELS) as ZoneId[]).map((zone) => {
    const tables = state.tables.filter(
      (table) => table.isActive && table.zone === zone && table.status !== "maintenance",
    );
    const heldInZone = tables.filter((table) => held.has(table.id)).length;
    return {
      zone,
      label: ZONE_LABELS[zone],
      tables: tables.length,
      held: heldInZone,
      utilization: tables.length ? heldInZone / tables.length : 0,
    };
  });
}

export function statusBreakdown(state: DemoState): Array<{ status: string; count: number }> {
  const todays = reservationsOnDate(state.reservations, localDateKey(state.demoNow));
  const order = ["pending", "confirmed", "checked_in", "seated", "completed", "cancelled", "no_show", "waitlisted"];
  return order.map((status) => ({
    status,
    count: todays.filter((reservation) => reservation.status === status).length,
  }));
}

export function upcomingReservations(state: DemoState, hours = 4): Reservation[] {
  const now = new Date(state.demoNow).getTime();
  return reservationsOnDate(state.reservations, localDateKey(state.demoNow))
    .filter((reservation) => {
      const start = new Date(reservation.startTime).getTime();
      return (
        ["confirmed", "pending"].includes(reservation.status) &&
        start >= now - 15 * 60_000 &&
        start <= now + hours * 60 * 60_000
      );
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function finalisedWindowStats(state: DemoState): {
  completed: number;
  noShows: number;
  cancellations: number;
} {
  const todayKey = localDateKey(state.demoNow);
  const now = new Date(state.demoNow).getTime();
  const recentPast = state.reservations.filter(
    (reservation) =>
      inLastDays(reservation.startTime, todayKey, 14) &&
      new Date(reservation.startTime).getTime() < now,
  );
  return {
    completed: recentPast.filter((reservation) => reservation.status === "completed").length,
    noShows: recentPast.filter((reservation) => reservation.status === "no_show").length,
    cancellations: recentPast.filter((reservation) => reservation.status === "cancelled").length,
  };
}
