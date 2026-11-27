import {
  BUFFER_MINUTES,
  LEAD_MINUTES,
  SERVICES,
  TABLES,
  ZONE_LABELS,
} from "./constants";
import {
  addDaysKey,
  combineDateTime,
  formatTimeLabel,
  intervalsOverlap,
  isPeakHour,
  localDateKey,
  minutesToTime,
  timeToMinutes,
} from "./time";
import type {
  DemoState,
  Reservation,
  ReservationStatus,
  RestaurantTable,
  ServiceOffering,
  SlotOption,
  SmartInsight,
  TableAllocation,
  TableLiveState,
  WaitlistMatch,
} from "./types";

const BLOCKING_STATUSES = new Set<ReservationStatus>([
  "pending",
  "confirmed",
  "checked_in",
  "seated",
]);

export function isBlockingStatus(status: ReservationStatus): boolean {
  return BLOCKING_STATUSES.has(status);
}

export function reservationDuration(
  service: ServiceOffering,
  partySize: number,
  start: Date,
): number {
  return Math.max(service.durationMinutes, estimateTurnMinutes(partySize, start));
}

/**
 * Phase 7's estimateTurnMinutes: larger parties and peak sittings hold a
 * table longer, so the allocator does not stack two bookings too tightly.
 */
export function estimateTurnMinutes(partySize: number, start: Date): number {
  let minutes = 75;
  if (partySize > 4) minutes += 20;
  if (partySize > 7) minutes += 20;
  if (isPeakHour(start.getHours())) minutes += 15;
  return Math.min(minutes, 210);
}

export function reservationsOnDate(reservations: Reservation[], dateKey: string): Reservation[] {
  return reservations.filter((reservation) => localDateKey(reservation.startTime) === dateKey);
}

export function reservationZoneLabel(reservation: Reservation): string {
  return reservation.zone ? ZONE_LABELS[reservation.zone] : "Unassigned";
}

export function tableLabelForIds(tableIds: string[], tables: RestaurantTable[] = TABLES): string {
  const labels = tableIds
    .map((id) => tables.find((table) => table.id === id)?.tableNumber)
    .filter((value): value is string => Boolean(value));
  return labels.length ? labels.join(" + ") : "Unassigned";
}

export function serviceIsOpenAt(service: ServiceOffering, start: Date): boolean {
  const minute = start.getHours() * 60 + start.getMinutes();
  return minute >= timeToMinutes(service.openTime) && minute <= timeToMinutes(service.closeTime);
}

export function getServiceSlots(service: ServiceOffering, _dateKey: string): string[] {
  const open = timeToMinutes(service.openTime);
  const close = timeToMinutes(service.closeTime);
  const last = close - service.durationMinutes;
  if (last < open) return [];
  const slots: string[] = [];
  for (let minute = open; minute <= last; minute += service.slotMinutes) {
    slots.push(minutesToTime(minute));
  }
  return slots;
}

interface FreeTableArgs {
  tables: RestaurantTable[];
  reservations: Reservation[];
  start: Date;
  end: Date;
  excludeReservationId?: string;
  bufferMinutes?: number;
}

export function getFreeTablesAt({
  tables,
  reservations,
  start,
  end,
  excludeReservationId,
  bufferMinutes = BUFFER_MINUTES,
}: FreeTableArgs): RestaurantTable[] {
  const startMs = start.getTime();
  const endMs = end.getTime();
  const blocked = new Set<string>();

  for (const reservation of reservations) {
    if (reservation.id === excludeReservationId) continue;
    if (!isBlockingStatus(reservation.status) || reservation.tableIds.length === 0) continue;
    const otherStart = new Date(reservation.startTime).getTime();
    const otherEnd = new Date(reservation.endTime).getTime();
    if (intervalsOverlap(startMs, endMs, otherStart, otherEnd, bufferMinutes)) {
      reservation.tableIds.forEach((id) => blocked.add(id));
    }
  }

  return tables.filter(
    (table) => table.isActive && table.status !== "maintenance" && !blocked.has(table.id),
  );
}

interface AllocationArgs {
  tables: RestaurantTable[];
  reservations: Reservation[];
  start: Date;
  end: Date;
  partySize: number;
  preferredZone?: RestaurantTable["zone"] | null;
  excludeReservationId?: string;
  bufferMinutes?: number;
}

function allocationScore(
  zone: RestaurantTable["zone"],
  capacity: number,
  partySize: number,
  preferredZone: RestaurantTable["zone"] | null | undefined,
  combined: boolean,
): number {
  let score = 100 - Math.max(capacity - partySize, 0) * 6;
  if (preferredZone && zone === preferredZone) score += 14;
  if (partySize >= 6 && zone === "private_salon") score += 8;
  if (partySize <= 2 && zone === "window_bar") score += 3;
  if (combined) score -= 6;
  return score;
}

function describeAllocation(tables: RestaurantTable[], combined: boolean): string {
  const zone = ZONE_LABELS[tables[0]?.zone ?? "dining_room"];
  const labels = tables.map((table) => table.tableNumber).join(" + ");
  const capacity = tables.reduce((sum, table) => sum + table.maxCapacity, 0);
  if (combined) return `${labels} combined · ${zone} · seats ${capacity}`;
  const table = tables[0];
  return `${labels} · ${table?.label ?? zone} · seats ${capacity}`;
}

export function rankTableAllocations({
  tables,
  reservations,
  start,
  end,
  partySize,
  preferredZone,
  excludeReservationId,
  bufferMinutes,
}: AllocationArgs): TableAllocation[] {
  const free = getFreeTablesAt({
    tables,
    reservations,
    start,
    end,
    excludeReservationId,
    bufferMinutes,
  });
  const allocations: TableAllocation[] = [];

  for (const table of free) {
    if (table.maxCapacity < partySize || table.minCapacity > partySize + 2) continue;
    allocations.push({
      tableIds: [table.id],
      tables: [table],
      zone: table.zone,
      capacity: table.maxCapacity,
      combined: false,
      score: allocationScore(table.zone, table.maxCapacity, partySize, preferredZone, false),
      reason: describeAllocation([table], false),
    });
  }

  for (let i = 0; i < free.length; i += 1) {
    for (let j = i + 1; j < free.length; j += 1) {
      const first = free[i];
      const second = free[j];
      if (!first || !second || first.zone !== second.zone) continue;
      const combinable =
        first.combinableWith.includes(second.id) || second.combinableWith.includes(first.id);
      if (!combinable) continue;
      const capacity = first.maxCapacity + second.maxCapacity;
      if (capacity < partySize) continue;
      if (first.minCapacity + second.minCapacity > partySize + 2) continue;
      allocations.push({
        tableIds: [first.id, second.id],
        tables: [first, second],
        zone: first.zone,
        capacity,
        combined: true,
        score: allocationScore(first.zone, capacity, partySize, preferredZone, true),
        reason: describeAllocation([first, second], true),
      });
    }
  }

  return allocations.sort((a, b) => b.score - a.score || a.capacity - b.capacity);
}

export function findBestTableAllocation(args: AllocationArgs): TableAllocation | null {
  return rankTableAllocations(args)[0] ?? null;
}

export function validateTableSelection(args: {
  tables: RestaurantTable[];
  reservations: Reservation[];
  tableIds: string[];
  start: Date;
  end: Date;
  partySize: number;
  excludeReservationId?: string;
}): { ok: true; allocation: TableAllocation } | { ok: false; reason: string } {
  const { tables, reservations, tableIds, start, end, partySize, excludeReservationId } = args;
  const unique = Array.from(new Set(tableIds));
  if (unique.length === 0) return { ok: false, reason: "Choose at least one table." };
  if (unique.length > 2) return { ok: false, reason: "Up to two tables can be combined." };
  const selected = unique
    .map((id) => tables.find((table) => table.id === id))
    .filter((table): table is RestaurantTable => Boolean(table));
  if (selected.length !== unique.length) return { ok: false, reason: "That table does not exist." };
  if (selected.some((table) => !table.isActive || table.status === "maintenance")) {
    return { ok: false, reason: "That table is offline." };
  }
  const capacity = selected.reduce((sum, table) => sum + table.maxCapacity, 0);
  if (capacity < partySize) {
    return { ok: false, reason: "That table is too small for this party." };
  }
  if (selected.length === 2) {
    const [first, second] = selected;
    if (!first || !second || first.zone !== second.zone) {
      return { ok: false, reason: "Combined tables must be in the same zone." };
    }
    const combinable =
      first.combinableWith.includes(second.id) || second.combinableWith.includes(first.id);
    if (!combinable) return { ok: false, reason: "Those tables cannot be combined." };
  }
  const free = getFreeTablesAt({
    tables,
    reservations,
    start,
    end,
    excludeReservationId,
  });
  const freeIds = new Set(free.map((table) => table.id));
  if (selected.some((table) => !freeIds.has(table.id))) {
    return { ok: false, reason: "That table is already held for another booking." };
  }
  return {
    ok: true,
    allocation: {
      tableIds: selected.map((table) => table.id),
      tables: selected,
      zone: selected[0]?.zone ?? "dining_room",
      capacity,
      combined: selected.length > 1,
      score: 100,
      reason: describeAllocation(selected, selected.length > 1),
    },
  };
}

function countFreeTablesForParty(args: AllocationArgs): number {
  const free = getFreeTablesAt(args);
  const singles = free.filter((table) => table.maxCapacity >= args.partySize).length;
  if (singles > 0) return singles;
  return rankTableAllocations(args).filter((allocation) => allocation.combined).length;
}

interface SlotArgs {
  serviceId: string;
  dateKey: string;
  partySize: number;
  excludeReservationId?: string;
}

export function suggestSlotOptions(state: DemoState, args: SlotArgs): SlotOption[] {
  const service = SERVICES.find((entry) => entry.id === args.serviceId);
  if (!service) return [];
  if (args.partySize < service.minPartySize || args.partySize > service.maxPartySize) return [];

  const demoNow = new Date(state.demoNow);
  const todayKey = localDateKey(demoNow);
  const isToday = args.dateKey === todayKey;
  const options = getServiceSlots(service, args.dateKey).map<Omit<SlotOption, "smartPick">>((time) => {
    const start = combineDateTime(args.dateKey, time);
    const end = new Date(
      start.getTime() + reservationDuration(service, args.partySize, start) * 60_000,
    );
    const past = isToday && start.getTime() < demoNow.getTime() + LEAD_MINUTES * 60_000;
    const allocations = rankTableAllocations({
      tables: state.tables,
      reservations: state.reservations,
      start,
      end,
      partySize: args.partySize,
      preferredZone: service.zone,
      excludeReservationId: args.excludeReservationId,
    });
    const allocation = allocations[0] ?? null;
    const available = !past && Boolean(allocation);
    return {
      time,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      available,
      past,
      tablesLeft: available ? countFreeTablesForParty({
        tables: state.tables,
        reservations: state.reservations,
        start,
        end,
        partySize: args.partySize,
        preferredZone: service.zone,
        excludeReservationId: args.excludeReservationId,
      }) : 0,
      allocation,
      reason: past
        ? "Past the booking window"
        : allocation
          ? allocation.reason
          : "Fully booked · waitlist available",
      peak: isPeakHour(start.getHours()),
    };
  });

  const availableOptions = options
    .map((option, index) => ({ option, index }))
    .filter(({ option }) => option.available);
  const preferredHour = args.dateKey === todayKey
    ? Math.max(12, Math.round(demoNow.getHours() + 1))
    : service.id === "svc_brunch" || service.id === "svc_coffee"
      ? 11
      : 19;
  const best = availableOptions
    .slice()
    .sort((a, b) => {
      const scoreDiff = (b.option.allocation?.score ?? 0) - (a.option.allocation?.score ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      const aHour = new Date(a.option.startTime).getHours();
      const bHour = new Date(b.option.startTime).getHours();
      return Math.abs(aHour - preferredHour) - Math.abs(bHour - preferredHour);
    })[0];
  const second = availableOptions
    .filter(({ index }) => index !== best?.index)
    .sort((a, b) => (b.option.allocation?.score ?? 0) - (a.option.allocation?.score ?? 0))[0];

  return options.map((option, index) => ({
    ...option,
    smartPick: index === best?.index || index === second?.index,
  }));
}

export function nextAvailableForService(
  state: DemoState,
  serviceId: string,
  partySize = 2,
): SlotOption | null {
  const service = SERVICES.find((entry) => entry.id === serviceId);
  if (!service) return null;
  const startDateKey = localDateKey(state.demoNow);
  const clampedParty = Math.min(Math.max(partySize, service.minPartySize), service.maxPartySize);
  for (let offset = 0; offset <= 10; offset += 1) {
    const dateKey = addDaysKey(startDateKey, offset);
    const option = suggestSlotOptions(state, {
      serviceId,
      dateKey,
      partySize: clampedParty,
    }).find((slot) => slot.available);
    if (option) return option;
  }
  return null;
}

export function hasAvailabilityOnDate(
  state: DemoState,
  serviceId: string,
  dateKey: string,
  partySize: number,
): boolean {
  return suggestSlotOptions(state, { serviceId, dateKey, partySize }).some(
    (slot) => slot.available,
  );
}

export function getWaitlistMatches(state: DemoState): WaitlistMatch[] {
  const demoNow = new Date(state.demoNow);
  const matches: WaitlistMatch[] = [];
  for (const entry of state.waitlist) {
    if (entry.status !== "waiting") continue;
    const service = SERVICES.find((item) => item.id === entry.serviceId);
    if (!service) continue;
    const start = combineDateTime(entry.desiredDate, entry.desiredFrom);
    if (start.getTime() < demoNow.getTime() - 15 * 60_000) continue;
    const end = new Date(
      start.getTime() + reservationDuration(service, entry.partySize, start) * 60_000,
    );
    const customerAlreadyBooked = state.reservations.some(
      (reservation) =>
        reservation.customerId === entry.customerId &&
        reservation.id !== entry.reservationId &&
        isBlockingStatus(reservation.status) &&
        intervalsOverlap(
          start.getTime(),
          end.getTime(),
          new Date(reservation.startTime).getTime(),
          new Date(reservation.endTime).getTime(),
        ),
    );
    if (customerAlreadyBooked) continue;
    const allocation = findBestTableAllocation({
      tables: state.tables,
      reservations: state.reservations,
      start,
      end,
      partySize: entry.partySize,
      preferredZone: entry.preferredZone,
      excludeReservationId: entry.reservationId,
    });
    if (allocation) matches.push({ entry, allocation });
  }
  return matches.sort((a, b) => a.entry.joinedAt.localeCompare(b.entry.joinedAt));
}

export function getTableLiveState(
  state: DemoState,
  table: RestaurantTable,
): TableLiveState {
  if (!table.isActive) {
    return { table, state: "maintenance", currentReservation: null, nextReservation: null };
  }
  if (table.status === "maintenance") {
    return { table, state: "maintenance", currentReservation: null, nextReservation: null };
  }

  const now = new Date(state.demoNow).getTime();
  const today = localDateKey(state.demoNow);
  const todays = reservationsOnDate(state.reservations, today)
    .filter((reservation) => reservation.tableIds.includes(table.id))
    .filter((reservation) => !["cancelled", "no_show", "completed", "waitlisted"].includes(reservation.status))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const active = todays.find((reservation) => {
    const start = new Date(reservation.startTime).getTime();
    const end = new Date(reservation.endTime).getTime();
    return (
      ["checked_in", "seated"].includes(reservation.status) && start <= now && end > now
    );
  });
  if (active) {
    return {
      table,
      state: "occupied",
      currentReservation: active,
      nextReservation: todays.find((reservation) => new Date(reservation.startTime).getTime() > now) ?? null,
    };
  }

  const held = todays.find((reservation) => {
    const start = new Date(reservation.startTime).getTime();
    const end = new Date(reservation.endTime).getTime();
    return ["confirmed", "pending"].includes(reservation.status) && start <= now && end > now;
  });
  if (held) {
    return { table, state: "reserved", currentReservation: held, nextReservation: null };
  }

  const next = todays.find((reservation) => new Date(reservation.startTime).getTime() > now) ?? null;
  const nextStart = next ? new Date(next.startTime).getTime() : Infinity;
  const soon = nextStart - now <= 4 * 60 * 60_000;
  return {
    table,
    state: soon ? "reserved" : "available",
    currentReservation: null,
    nextReservation: next,
  };
}

export function buildSmartInsights(state: DemoState): SmartInsight[] {
  const demoNow = new Date(state.demoNow);
  const today = localDateKey(state.demoNow);
  const todays = reservationsOnDate(state.reservations, today);
  const insights: SmartInsight[] = [];

  const matches = getWaitlistMatches(state);
  for (const match of matches.slice(0, 2)) {
    insights.push({
      id: `insight_waitlist_${match.entry.id}`,
      severity: "success",
      title: "Waitlist match ready",
      body: `${match.entry.guestName} · party of ${match.entry.partySize} · ${formatTimeLabel(match.entry.desiredFrom)}. ${match.allocation.reason} is free. Auto-offer?`,
      actionLabel: "Confirm seat",
      action: "promote_waitlist",
      waitlistId: match.entry.id,
    });
  }

  const vipArrivals = todays
    .filter(
      (reservation) =>
        reservation.vip &&
        ["confirmed", "pending"].includes(reservation.status) &&
        new Date(reservation.startTime).getTime() >= demoNow.getTime() &&
        new Date(reservation.startTime).getTime() <= demoNow.getTime() + 3 * 60 * 60_000,
    )
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const vip = vipArrivals[0];
  if (vip) {
    insights.push({
      id: `insight_vip_${vip.id}`,
      severity: "info",
      title: "VIP arrival approaching",
      body: `${vip.guestName} · party of ${vip.partySize} at ${new Date(vip.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}. ${vip.specialRequests || "No special requests."}`,
      actionLabel: "Open booking",
      action: "open_reservation",
      reservationId: vip.id,
    });
  }

  const byHour = new Map<number, number>();
  for (const reservation of todays) {
    if (["cancelled", "no_show", "waitlisted"].includes(reservation.status)) continue;
    const hour = new Date(reservation.startTime).getHours();
    byHour.set(hour, (byHour.get(hour) ?? 0) + 1);
  }
  const busiest = Array.from(byHour.entries()).sort((a, b) => b[1] - a[1])[0];
  if (busiest && busiest[1] >= 4) {
    insights.push({
      id: "insight_peak",
      severity: "warning",
      title: `Dinner rush building at ${formatTimeLabel(minutesToTime(busiest[0] * 60))}`,
      body: `${busiest[1]} parties are expected in that hour across ${state.tables.filter((table) => table.isActive && table.status !== "maintenance").length} active tables. Hold the window bar for walk-ins.`,
      actionLabel: "View calendar",
      action: "view_calendar",
    });
  }

  const upcoming = todays
    .filter((reservation) => new Date(reservation.startTime).getTime() > demoNow.getTime())
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  for (const offline of state.tables.filter(
    (table) => table.status === "maintenance" || !table.isActive,
  )) {
    const conflict = upcoming.find((reservation) => reservation.tableIds.includes(offline.id));
    if (conflict) {
      insights.push({
        id: `insight_maintenance_${offline.id}`,
        severity: "critical",
        title: `${offline.tableNumber} is offline but still holds a booking`,
        body: `${conflict.guestName} arrives at ${new Date(conflict.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}. Reassign the table before service.`,
        actionLabel: "Open booking",
        action: "open_reservation",
        reservationId: conflict.id,
      });
      break;
    }
  }

  const pending = todays.filter((reservation) => reservation.status === "pending");
  if (pending.length > 0) {
    insights.push({
      id: "insight_pending",
      severity: "warning",
      title: `${pending.length} request${pending.length === 1 ? "" : "s"} waiting for confirmation`,
      body: "Smart allocation has already selected a table for each request. Confirm before the hold expires.",
      actionLabel: "Review queue",
      action: "view_queue",
    });
  }

  const order: Record<SmartInsight["severity"], number> = {
    critical: 0,
    warning: 1,
    success: 2,
    info: 3,
  };
  return insights.sort((a, b) => order[a.severity] - order[b.severity]);
}

export function getTableZoneSummary(state: DemoState): Array<{
  zone: RestaurantTable["zone"];
  label: string;
  tables: number;
  occupied: number;
  reserved: number;
  maintenance: number;
}> {
  return (Object.keys(ZONE_LABELS) as RestaurantTable["zone"][]).map((zone) => {
    const tables = state.tables.filter((table) => table.zone === zone && table.isActive);
    const states = tables.map((table) => getTableLiveState(state, table).state);
    return {
      zone,
      label: ZONE_LABELS[zone],
      tables: tables.length,
      occupied: states.filter((value) => value === "occupied").length,
      reserved: states.filter((value) => value === "reserved").length,
      maintenance: tables.filter((table) => table.status === "maintenance").length,
    };
  });
}
