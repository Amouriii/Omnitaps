import { ADD_ONS, LEAD_MINUTES, OPS_PERSONAS, getService } from "./constants";
import { calculateBookingPrice } from "./pricing";
import {
  findBestTableAllocation,
  reservationDuration,
  validateTableSelection,
} from "./smart";
import {
  combineDateTime,
  intervalsOverlap,
  localDateKey,
  minutesToTime,
  timeToMinutes,
} from "./time";
import type {
  CreateReservationInput,
  CreateReservationResult,
  Customer,
  DemoErrorCode,
  DemoNotification,
  DemoState,
  ModifyReservationInput,
  Reservation,
  RescheduleInput,
  RestaurantTable,
  ServiceOffering,
  TableAllocation,
  WaitlistEntry,
} from "./types";

export class DemoApiError extends Error {
  code: DemoErrorCode;

  constructor(code: DemoErrorCode, message: string) {
    super(message);
    this.name = "DemoApiError";
    this.code = code;
  }
}

interface PromotionResult {
  reservations: Reservation[];
  waitlist: WaitlistEntry[];
  notifications: DemoNotification[];
  activity: DemoState["activity"];
  promoted: Reservation[];
}

export interface MutationResult {
  state: DemoState;
  promoted: Reservation[];
}

export interface PromotionMutationResult {
  state: DemoState;
  reservation: Reservation;
}

let apiDemoClock: string | null = null;

/**
 * The demo keeps a service clock that may be pinned outside real opening
 * hours. Domain timestamps (reservations, notifications, activity) follow that
 * clock so relative labels stay coherent; `updatedAt` deliberately stays on
 * the wall clock because it is the cross-tab conflict token.
 */
export function setApiDemoClock(iso: string | null): void {
  apiDemoClock = iso;
}

function nowIso(): string {
  return apiDemoClock ?? new Date().toISOString();
}

function wallClockIso(): string {
  return new Date().toISOString();
}

function touch(state: DemoState): DemoState {
  return { ...state, revision: state.revision + 1, updatedAt: wallClockIso() };
}

function newReference(state: DemoState): string {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const reference = `HL-${suffix}`;
    const used =
      state.reservations.some((reservation) => reservation.reference === reference) ||
      state.waitlist.some((entry) => entry.reference === reference);
    if (!used) return reference;
  }
  return `HL-${Date.now().toString(36).slice(-4).toUpperCase()}`;
}

function newNotificationId(): string {
  return `ntf_${Math.random().toString(36).slice(2, 10)}`;
}

function newActivityId(): string {
  return `act_${Math.random().toString(36).slice(2, 10)}`;
}

function staffName(state: DemoState, override?: string): string {
  if (override) return override;
  return (
    OPS_PERSONAS.find((persona) => persona.id === state.activeOpsPersonaId)?.name ??
    "Floor team"
  );
}

function customerFor(state: DemoState, customerId: string): Customer {
  return state.customers.find((customer) => customer.id === customerId) ?? state.customers[0];
}

function notification(
  audience: DemoNotification["audience"],
  kind: DemoNotification["kind"],
  title: string,
  body: string,
  options?: { customerId?: string; reservationId?: string; createdAt?: string },
): DemoNotification {
  return {
    id: newNotificationId(),
    audience,
    kind,
    title,
    body,
    customerId: options?.customerId,
    reservationId: options?.reservationId,
    createdAt: options?.createdAt ?? nowIso(),
    read: false,
  };
}

function activity(
  actor: DemoState["activity"][number]["actor"],
  actorName: string,
  message: string,
  reservationId?: string,
): DemoState["activity"][number] {
  return {
    id: newActivityId(),
    at: nowIso(),
    actor,
    actorName,
    message,
    reservationId,
  };
}

function assertContact(name: string, email: string, phone: string): void {
  if (name.trim().length < 2) {
    throw new DemoApiError("INVALID_INPUT", "Please add the guest name.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    throw new DemoApiError("INVALID_INPUT", "Please add a valid email address.");
  }
  if (phone.replace(/\D/g, "").length < 6) {
    throw new DemoApiError("INVALID_INPUT", "Please add a reachable phone number.");
  }
}

function assertPartySize(service: ServiceOffering, partySize: number): void {
  if (!Number.isInteger(partySize) || partySize < 1) {
    throw new DemoApiError("INVALID_INPUT", "Party size must be at least one guest.");
  }
  if (partySize < service.minPartySize || partySize > service.maxPartySize) {
    throw new DemoApiError(
      "INVALID_INPUT",
      `${service.name} seats ${service.minPartySize}–${service.maxPartySize} guests.`,
    );
  }
}

function assertBookable(state: DemoState, dateKey: string, time: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !/^\d{2}:\d{2}$/.test(time)) {
    throw new DemoApiError("INVALID_INPUT", "Choose a valid date and time.");
  }
  const start = combineDateTime(dateKey, time);
  const todayKey = localDateKey(state.demoNow);
  if (dateKey < todayKey) {
    throw new DemoApiError("INVALID_INPUT", "That date has already passed.");
  }
  if (dateKey === todayKey && start.getTime() < new Date(state.demoNow).getTime() + LEAD_MINUTES * 60_000) {
    throw new DemoApiError(
      "INVALID_INPUT",
      `Same-day bookings need at least ${LEAD_MINUTES} minutes' notice.`,
    );
  }
  return start;
}

function assertServiceWindow(service: ServiceOffering, start: Date): void {
  const minute = start.getHours() * 60 + start.getMinutes();
  if (minute < timeToMinutes(service.openTime) || minute > timeToMinutes(service.closeTime)) {
    throw new DemoApiError(
      "INVALID_INPUT",
      `${service.name} is served between ${service.openTime} and ${service.closeTime}.`,
    );
  }
}

function customerConflict(
  state: DemoState,
  customerId: string,
  start: Date,
  end: Date,
  excludeReservationId?: string,
): Reservation | null {
  return (
    state.reservations.find((reservation) => {
      if (reservation.id === excludeReservationId) return false;
      if (reservation.customerId !== customerId) return false;
      if (!["pending", "confirmed", "checked_in", "seated"].includes(reservation.status)) return false;
      return intervalsOverlap(
        start.getTime(),
        end.getTime(),
        new Date(reservation.startTime).getTime(),
        new Date(reservation.endTime).getTime(),
      );
    }) ?? null
  );
}

function overlappingWaitingWaitlist(
  state: DemoState,
  customerId: string,
  start: Date,
  end: Date,
): WaitlistEntry[] {
  return state.waitlist.filter((entry) => {
    if (entry.status !== "waiting" || entry.customerId !== customerId) return false;
    const service = getService(entry.serviceId);
    if (!service) return false;
    const desiredStart = combineDateTime(entry.desiredDate, entry.desiredFrom);
    const desiredEnd = new Date(
      desiredStart.getTime() +
        reservationDuration(service, entry.partySize, desiredStart) * 60_000,
    );
    return intervalsOverlap(
      start.getTime(),
      end.getTime(),
      desiredStart.getTime(),
      desiredEnd.getTime(),
    );
  });
}

function createReservationRecord(args: {
  state: DemoState;
  input: CreateReservationInput;
  customer: Customer;
  service: ServiceOffering;
  start: Date;
  end: Date;
  allocation: TableAllocation | null;
  status: "confirmed" | "waitlisted";
  reference: string;
  totalCents: number;
  waitlistEntryId?: string;
}): Reservation {
  const { input, customer, service, start, end, allocation, status, reference, totalCents } = args;
  const createdAt = nowIso();
  const addOnIds = input.addOnIds.filter((id) => service.addOnIds.includes(id));
  return {
    id: `res_${reference}`,
    reference,
    enterpriseId: args.state.enterprise.id,
    customerId: customer.id,
    guestName: input.guestName.trim(),
    guestEmail: input.guestEmail.trim(),
    guestPhone: input.guestPhone.trim(),
    serviceId: service.id,
    tableIds: allocation?.tableIds ?? [],
    partySize: input.partySize,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    status,
    zone: allocation?.zone ?? service.zone,
    addOnIds,
    specialRequests: input.specialRequests.trim().slice(0, 400),
    vip: customer.vip,
    source: "web",
    totalCents,
    createdAt,
    updatedAt: createdAt,
    reminderSentAt: null,
    waitlistEntryId: args.waitlistEntryId,
  };
}

function makeWaitlistEntry(args: {
  state: DemoState;
  reservation: Reservation;
  customer: Customer;
  service: ServiceOffering;
  start: Date;
  reference: string;
}): WaitlistEntry {
  const { state, reservation, customer, service, start, reference } = args;
  return {
    id: `wl_${reference}`,
    reference: `WL-${reference.split("-")[1] ?? reference}`,
    enterpriseId: state.enterprise.id,
    customerId: customer.id,
    guestName: customer.name,
    guestEmail: customer.email,
    guestPhone: customer.phone,
    serviceId: service.id,
    partySize: reservation.partySize,
    desiredDate: localDateKey(start),
    desiredFrom: `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`,
    desiredTo: minutesToTime(start.getHours() * 60 + start.getMinutes() + 120),
    preferredZone: reservation.zone,
    specialRequests: reservation.specialRequests,
    vip: reservation.vip,
    status: "waiting",
    joinedAt: reservation.createdAt,
    reservationId: reservation.id,
  };
}

export function createReservation(
  state: DemoState,
  input: CreateReservationInput,
): CreateReservationResult {
  const service = getService(input.serviceId);
  if (!service) throw new DemoApiError("NOT_FOUND", "That experience is not available.");
  assertContact(input.guestName, input.guestEmail, input.guestPhone);
  assertPartySize(service, input.partySize);
  const start = assertBookable(state, input.dateKey, input.time);
  assertServiceWindow(service, start);
  const end = new Date(
    start.getTime() + reservationDuration(service, input.partySize, start) * 60_000,
  );

  const customer = customerFor(state, state.activeCustomerId);
  const conflict = customerConflict(state, customer.id, start, end);
  if (conflict) {
    throw new DemoApiError(
      "CUSTOMER_CONFLICT",
      `You already have a table at that time (${conflict.reference}). Reschedule that booking or choose another time.`,
    );
  }
  const addOnIds = input.addOnIds.filter((id) => service.addOnIds.includes(id));
  const totalCents = calculateBookingPrice(service, input.partySize, addOnIds).totalCents;

  let allocation: TableAllocation | null = null;
  if (input.tableIds && input.tableIds.length > 0) {
    const selected = validateTableSelection({
      tables: state.tables,
      reservations: state.reservations,
      tableIds: input.tableIds,
      start,
      end,
      partySize: input.partySize,
    });
    if (!selected.ok) {
      throw new DemoApiError("TABLE_UNAVAILABLE", selected.reason);
    }
    allocation = selected.allocation;
  } else {
    allocation = findBestTableAllocation({
      tables: state.tables,
      reservations: state.reservations,
      start,
      end,
      partySize: input.partySize,
      preferredZone: service.zone,
    });
  }

  const reference = newReference(state);

  if (!allocation) {
    if (!input.joinWaitlist) {
      throw new DemoApiError(
        "NO_AVAILABILITY",
        "That sitting is fully booked. Join the smart waitlist and we'll auto-match you when a table opens.",
      );
    }
    if (!state.settings.acceptWaitlist) {
      throw new DemoApiError("NO_AVAILABILITY", "The waitlist is closed for this service.");
    }

    const position =
      state.waitlist.filter(
        (entry) =>
          entry.status === "waiting" &&
          entry.desiredDate === input.dateKey &&
          entry.serviceId === input.serviceId,
      ).length + 1;
    const waitlistEntryId = `wl_${reference}`;
    const reservation = createReservationRecord({
      state,
      input,
      customer,
      service,
      start,
      end,
      allocation: null,
      status: "waitlisted",
      reference,
      totalCents,
      waitlistEntryId,
    });
    const entry = makeWaitlistEntry({
      state,
      reservation,
      customer,
      service,
      start,
      reference,
    });
    const notifications = [
      notification(
        "customer",
        "waitlist",
        position === 1 ? "You're first on the waitlist" : `You're #${position} on the smart waitlist`,
        `${service.name} is full at that time. We'll auto-offer you the first matching table — no charge and cancel any time.`,
        { customerId: customer.id, reservationId: reservation.id },
      ),
      notification(
        "enterprise",
        "waitlist",
        `${customer.vip ? "VIP " : ""}Waitlist request · ${service.name}`,
        `${customer.name} · party of ${input.partySize} · ${input.time}. ${position} waiting for this sitting.`,
        { customerId: customer.id, reservationId: reservation.id },
      ),
      ...state.notifications,
    ];
    const nextState = touch({
      ...state,
      reservations: [...state.reservations, reservation],
      waitlist: [...state.waitlist, entry],
      notifications,
      activity: [
        activity(
          "customer",
          customer.name,
          `joined the waitlist for ${service.name} at ${input.time}.`,
          reservation.id,
        ),
        ...state.activity,
      ],
    });
    return {
      state: nextState,
      reservation,
      waitlisted: true,
      allocation: null,
      waitlistPosition: position,
    };
  }

  const reservation = createReservationRecord({
    state,
    input,
    customer,
    service,
    start,
    end,
    allocation,
    status: "confirmed",
    reference,
    totalCents,
  });

  let notifications = [
    notification(
      "customer",
      "booking",
      "Table confirmed",
      `${service.name} for ${input.partySize} · ${start.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} at ${input.time}. ${allocation.reason}.`,
      { customerId: customer.id, reservationId: reservation.id },
    ),
    ...state.notifications,
  ];
  const closedWaitlistEntries = overlappingWaitingWaitlist(
    state,
    customer.id,
    start,
    end,
  );
  if (closedWaitlistEntries.length > 0) {
    notifications = [
      notification(
        "customer",
        "waitlist",
        "Waitlist request closed",
        `Your confirmed booking overlaps this request, so we closed it. Your table is held under ${reference}.`,
        { customerId: customer.id, reservationId: reservation.id },
      ),
      ...notifications,
    ];
  }
  if (customer.vip || input.partySize >= 6) {
    notifications = [
      notification(
        "enterprise",
        "insight",
        customer.vip ? "VIP booking confirmed" : "Large-party booking confirmed",
        `${customer.name} · party of ${input.partySize} · ${service.name} · ${input.time}. ${input.specialRequests || "No special requests."}`,
        { customerId: customer.id, reservationId: reservation.id },
      ),
      ...notifications,
    ];
  }

  const nextState = touch({
    ...state,
    reservations: [
      ...state.reservations.map((item) =>
        closedWaitlistEntries.some((entry) => entry.reservationId === item.id) &&
        item.status === "waitlisted"
          ? { ...item, status: "cancelled" as const, updatedAt: nowIso() }
          : item,
      ),
      reservation,
    ],
    waitlist:
      closedWaitlistEntries.length > 0
        ? state.waitlist.map((entry) =>
            closedWaitlistEntries.some((closed) => closed.id === entry.id)
              ? { ...entry, status: "cancelled" as const }
              : entry,
          )
        : state.waitlist,
    notifications,
    activity: [
      activity(
        "customer",
        customer.name,
        `booked ${service.name} for ${input.partySize} at ${input.time}.`,
        reservation.id,
      ),
      ...(closedWaitlistEntries.length > 0
        ? [
            activity(
              "system",
              "Smart engine",
              `closed ${customer.name}'s overlapping waitlist request after the booking was confirmed.`,
              reservation.id,
            ),
          ]
        : []),
      ...state.activity,
    ],
  });

  return {
    state: nextState,
    reservation,
    waitlisted: false,
    allocation,
    waitlistPosition: null,
  };
}

export function joinWaitlist(state: DemoState, input: CreateReservationInput): CreateReservationResult {
  const service = getService(input.serviceId);
  if (!service) throw new DemoApiError("NOT_FOUND", "That experience is not available.");
  assertContact(input.guestName, input.guestEmail, input.guestPhone);
  assertPartySize(service, input.partySize);
  const start = assertBookable(state, input.dateKey, input.time);
  assertServiceWindow(service, start);
  const customer = customerFor(state, state.activeCustomerId);
  const existing = state.waitlist.find(
    (entry) =>
      entry.status === "waiting" &&
      entry.customerId === customer.id &&
      entry.serviceId === input.serviceId &&
      entry.desiredDate === input.dateKey,
  );
  if (existing) {
    throw new DemoApiError(
      "CUSTOMER_CONFLICT",
      "You're already on the waitlist for this service. We'll auto-match you when a table opens.",
    );
  }
  const end = new Date(
    start.getTime() + reservationDuration(service, input.partySize, start) * 60_000,
  );
  const conflict = customerConflict(state, customer.id, start, end);
  if (conflict) {
    throw new DemoApiError(
      "CUSTOMER_CONFLICT",
      `You already have a table at that time (${conflict.reference}). Choose another sitting.`,
    );
  }
  const reference = newReference(state);
  const addOnIds = input.addOnIds.filter((id) => service.addOnIds.includes(id));
  const totalCents = calculateBookingPrice(service, input.partySize, addOnIds).totalCents;
  const position =
    state.waitlist.filter(
      (entry) =>
        entry.status === "waiting" &&
        entry.desiredDate === input.dateKey &&
        entry.serviceId === input.serviceId,
    ).length + 1;
  const reservation = createReservationRecord({
    state,
    input,
    customer,
    service,
    start,
    end,
    allocation: null,
    status: "waitlisted",
    reference,
    totalCents,
    waitlistEntryId: `wl_${reference}`,
  });
  const entry = makeWaitlistEntry({
    state,
    reservation,
    customer,
    service,
    start,
    reference,
  });
  const nextState = touch({
    ...state,
    reservations: [...state.reservations, reservation],
    waitlist: [...state.waitlist, entry],
    notifications: [
      notification(
        "customer",
        "waitlist",
        `You're #${position} on the smart waitlist`,
        `${service.name} · ${input.time}. We auto-offer tables in waitlist order; cancel any time.`,
        { customerId: customer.id, reservationId: reservation.id },
      ),
      notification(
        "enterprise",
        "waitlist",
        `${customer.vip ? "VIP " : ""}Waitlist request · ${service.name}`,
        `${customer.name} · party of ${input.partySize} · ${input.time}.`,
        { customerId: customer.id, reservationId: reservation.id },
      ),
      ...state.notifications,
    ],
    activity: [
      activity(
        "customer",
        customer.name,
        `joined the waitlist for ${service.name} at ${input.time}.`,
        reservation.id,
      ),
      ...state.activity,
    ],
  });
  return {
    state: nextState,
    reservation,
    waitlisted: true,
    allocation: null,
    waitlistPosition: position,
  };
}

function promoteWaiting(state: DemoState, staffOverride?: string): PromotionResult {
  const now = new Date(state.demoNow);
  const reservations = [...state.reservations];
  const waitlist = [...state.waitlist];
  let notifications = [...state.notifications];
  let activityLog = [...state.activity];
  const promoted: Reservation[] = [];
  const actor = staffName(state, staffOverride);

  const waiting = waitlist
    .filter((entry) => entry.status === "waiting")
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));

  for (const entry of waiting) {
    const start = combineDateTime(entry.desiredDate, entry.desiredFrom);
    if (start.getTime() < now.getTime() - 15 * 60_000) continue;
    const service = getService(entry.serviceId);
    if (!service) continue;
    const reservationIndex = reservations.findIndex(
      (reservation) => reservation.id === entry.reservationId,
    );
    if (reservationIndex < 0) continue;
    const reservation = reservations[reservationIndex];
    if (!reservation || reservation.status !== "waitlisted") continue;
    const end = new Date(
      start.getTime() + reservationDuration(service, entry.partySize, start) * 60_000,
    );
    const hasOtherBooking = reservations.some(
      (other) =>
        other.customerId === entry.customerId &&
        other.id !== reservation.id &&
        ["pending", "confirmed", "checked_in", "seated"].includes(other.status) &&
        intervalsOverlap(
          start.getTime(),
          end.getTime(),
          new Date(other.startTime).getTime(),
          new Date(other.endTime).getTime(),
        ),
    );
    if (hasOtherBooking) continue;
    const allocation = findBestTableAllocation({
      tables: state.tables,
      reservations,
      start,
      end,
      partySize: entry.partySize,
      preferredZone: entry.preferredZone,
      excludeReservationId: entry.reservationId,
    });
    if (!allocation) continue;

    const promotedReservation: Reservation = {
      ...reservation,
      status: "confirmed",
      tableIds: allocation.tableIds,
      zone: allocation.zone,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      updatedAt: nowIso(),
    };
    reservations[reservationIndex] = promotedReservation;
    const entryIndex = waitlist.findIndex((item) => item.id === entry.id);
    if (entryIndex >= 0) {
      waitlist[entryIndex] = {
        ...entry,
        status: "promoted",
        promotedAt: nowIso(),
      };
    }
    promoted.push(promotedReservation);
    notifications = [
      notification(
        "customer",
        "waitlist",
        "A table opened up — you're confirmed",
        `${service.name} · ${entry.desiredFrom}. ${allocation.reason}. Your booking reference is ${promotedReservation.reference}.`,
        {
          customerId: entry.customerId,
          reservationId: promotedReservation.id,
        },
      ),
      ...notifications,
    ];
    activityLog = [
      activity(
        "system",
        "Smart engine",
        `auto-promoted ${entry.guestName} from the waitlist into ${allocation.reason}.`,
        promotedReservation.id,
      ),
      ...activityLog,
    ];
  }

  if (promoted.length > 0) {
    notifications = [
      notification(
        "enterprise",
        "waitlist",
        `${promoted.length} waitlist ${promoted.length === 1 ? "guest" : "guests"} auto-filled`,
        `${actor} reviewed the smart waitlist. ${promoted.map((reservation) => reservation.guestName).join(", ")} ${promoted.length === 1 ? "was" : "were"} confirmed automatically.`,
      ),
      ...notifications,
    ];
  }

  return { reservations, waitlist, notifications, activity: activityLog, promoted };
}

export function autoFillWaitlist(state: DemoState, staffOverride?: string): MutationResult {
  const result = promoteWaiting(state, staffOverride);
  return {
    state: touch({
      ...state,
      reservations: result.reservations,
      waitlist: result.waitlist,
      notifications: result.notifications,
      activity: result.activity,
    }),
    promoted: result.promoted,
  };
}

export function promoteWaitlistEntry(
  state: DemoState,
  entryId: string,
  staffOverride?: string,
): PromotionMutationResult {
  const entry = state.waitlist.find((item) => item.id === entryId);
  if (!entry) throw new DemoApiError("NOT_FOUND", "That waitlist request no longer exists.");
  if (entry.status !== "waiting") {
    throw new DemoApiError("INVALID_TRANSITION", "That waitlist request has already been handled.");
  }
  const service = getService(entry.serviceId);
  if (!service) throw new DemoApiError("NOT_FOUND", "That experience is not available.");
  const start = combineDateTime(entry.desiredDate, entry.desiredFrom);
  const end = new Date(
    start.getTime() + reservationDuration(service, entry.partySize, start) * 60_000,
  );
  const allocation = findBestTableAllocation({
    tables: state.tables,
    reservations: state.reservations,
    start,
    end,
    partySize: entry.partySize,
    preferredZone: entry.preferredZone,
    excludeReservationId: entry.reservationId,
  });
  if (!allocation) {
    throw new DemoApiError(
      "NO_AVAILABILITY",
      "No table is free for that window yet. Try again after the next cancellation.",
    );
  }
  const reservationIndex = state.reservations.findIndex(
    (reservation) => reservation.id === entry.reservationId,
  );
  if (reservationIndex < 0) throw new DemoApiError("NOT_FOUND", "The linked booking was not found.");
  const reservation = state.reservations[reservationIndex];
  if (!reservation) throw new DemoApiError("NOT_FOUND", "The linked booking was not found.");

  const promotedReservation: Reservation = {
    ...reservation,
    status: "confirmed",
    tableIds: allocation.tableIds,
    zone: allocation.zone,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    updatedAt: nowIso(),
  };
  const reservations = state.reservations.map((item, index) =>
    index === reservationIndex ? promotedReservation : item,
  );
  const waitlist = state.waitlist.map((item) =>
    item.id === entry.id ? { ...item, status: "promoted" as const, promotedAt: nowIso() } : item,
  );
  const actor = staffName(state, staffOverride);
  return {
    state: touch({
      ...state,
      reservations,
      waitlist,
      notifications: [
        notification(
          "customer",
          "waitlist",
          "A table opened up — you're confirmed",
          `${service.name} · ${entry.desiredFrom}. ${allocation.reason}. Reference ${promotedReservation.reference}.`,
          { customerId: entry.customerId, reservationId: promotedReservation.id },
        ),
        notification(
          "enterprise",
          "waitlist",
          "Waitlist match confirmed",
          `${entry.guestName} was moved from the waitlist into ${allocation.reason}.`,
          { customerId: entry.customerId, reservationId: promotedReservation.id },
        ),
        ...state.notifications,
      ],
      activity: [
        activity(
          "staff",
          actor,
          `confirmed a waitlist match for ${entry.guestName} at ${allocation.reason}.`,
          promotedReservation.id,
        ),
        ...state.activity,
      ],
    }),
    reservation: promotedReservation,
  };
}

export function rescheduleReservation(
  state: DemoState,
  reservationId: string,
  input: RescheduleInput,
  staffOverride?: string,
): DemoState {
  const reservation = state.reservations.find((item) => item.id === reservationId);
  if (!reservation) throw new DemoApiError("NOT_FOUND", "That reservation no longer exists.");
  if (!["pending", "confirmed"].includes(reservation.status)) {
    throw new DemoApiError(
      "INVALID_TRANSITION",
      "Only pending or confirmed bookings can be moved. Cancel and rebook this one.",
    );
  }
  const service = getService(reservation.serviceId);
  if (!service) throw new DemoApiError("NOT_FOUND", "That experience is not available.");
  const start = assertBookable(state, input.dateKey, input.time);
  assertServiceWindow(service, start);
  const end = new Date(
    start.getTime() + reservationDuration(service, reservation.partySize, start) * 60_000,
  );
  const conflict = customerConflict(state, reservation.customerId, start, end, reservation.id);
  if (conflict) {
    throw new DemoApiError(
      "CUSTOMER_CONFLICT",
      `That would overlap another booking (${conflict.reference}).`,
    );
  }

  let allocation: TableAllocation | null = null;
  if (input.tableIds && input.tableIds.length > 0) {
    const selected = validateTableSelection({
      tables: state.tables,
      reservations: state.reservations,
      tableIds: input.tableIds,
      start,
      end,
      partySize: reservation.partySize,
      excludeReservationId: reservation.id,
    });
    if (!selected.ok) throw new DemoApiError("TABLE_UNAVAILABLE", selected.reason);
    allocation = selected.allocation;
  } else {
    allocation = findBestTableAllocation({
      tables: state.tables,
      reservations: state.reservations,
      start,
      end,
      partySize: reservation.partySize,
      preferredZone: service.zone,
      excludeReservationId: reservation.id,
    });
  }
  if (!allocation) {
    throw new DemoApiError(
      "NO_AVAILABILITY",
      "No table is free at that time. Try another sitting or keep the current booking.",
    );
  }

  const byStaff = Boolean(staffOverride);
  const actor = staffOverride ?? reservation.guestName;
  const updated: Reservation = {
    ...reservation,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    tableIds: allocation.tableIds,
    zone: allocation.zone,
    status: "confirmed",
    updatedAt: nowIso(),
  };
  return touch({
    ...state,
    reservations: state.reservations.map((item) => (item.id === reservationId ? updated : item)),
    notifications: [
      notification(
        "customer",
        "status",
        "Your booking moved",
        `${service.name} is now ${start.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} at ${input.time}. ${allocation.reason}.`,
        { customerId: reservation.customerId, reservationId },
      ),
      ...state.notifications,
    ],
    activity: [
      activity(
        byStaff ? "staff" : "customer",
        actor,
        byStaff
          ? `moved ${reservation.guestName}'s booking to ${input.time} at ${allocation.reason}.`
          : `moved their booking to ${input.time} at ${allocation.reason}.`,
        reservationId,
      ),
      ...state.activity,
    ],
  });
}

export function modifyReservation(
  state: DemoState,
  reservationId: string,
  input: ModifyReservationInput,
  staffOverride?: string,
): DemoState {
  const reservation = state.reservations.find((item) => item.id === reservationId);
  if (!reservation) throw new DemoApiError("NOT_FOUND", "That reservation no longer exists.");
  if (!["pending", "confirmed"].includes(reservation.status)) {
    throw new DemoApiError("INVALID_TRANSITION", "This booking can no longer be modified.");
  }
  const service = getService(reservation.serviceId);
  if (!service) throw new DemoApiError("NOT_FOUND", "That experience is not available.");
  assertPartySize(service, input.partySize);
  const start = new Date(reservation.startTime);
  const end = new Date(
    start.getTime() + reservationDuration(service, input.partySize, start) * 60_000,
  );
  const allocation = findBestTableAllocation({
    tables: state.tables,
    reservations: state.reservations,
    start,
    end,
    partySize: input.partySize,
    preferredZone: service.zone,
    excludeReservationId: reservation.id,
  });
  if (!allocation) {
    throw new DemoApiError(
      "NO_AVAILABILITY",
      `We couldn't seat ${input.partySize} at that time. Keep the current table or choose a new sitting.`,
    );
  }
  const addOnIds = input.addOnIds.filter((id) => service.addOnIds.includes(id));
  const totalCents = calculateBookingPrice(service, input.partySize, addOnIds).totalCents;
  const updated: Reservation = {
    ...reservation,
    partySize: input.partySize,
    addOnIds,
    specialRequests: input.specialRequests.trim().slice(0, 400),
    tableIds: allocation.tableIds,
    zone: allocation.zone,
    endTime: end.toISOString(),
    totalCents,
    updatedAt: nowIso(),
  };
  const byStaff = Boolean(staffOverride);
  const actor = staffOverride ?? reservation.guestName;
  return touch({
    ...state,
    reservations: state.reservations.map((item) => (item.id === reservationId ? updated : item)),
    notifications: [
      notification(
        "customer",
        "status",
        "Your booking details are updated",
        `${service.name} · party of ${input.partySize} · ${allocation.reason}. ${input.specialRequests ? `We've noted: ${input.specialRequests.trim()}` : ""}`,
        { customerId: reservation.customerId, reservationId },
      ),
      ...state.notifications,
    ],
    activity: [
      activity(
        byStaff ? "staff" : "customer",
        actor,
        byStaff
          ? `updated ${reservation.guestName}'s party to ${input.partySize} and reassigned ${allocation.reason}.`
          : `updated their party to ${input.partySize}; the floor reassigned ${allocation.reason}.`,
        reservationId,
      ),
      ...state.activity,
    ],
  });
}

export function assignTable(
  state: DemoState,
  reservationId: string,
  tableIds: string[],
  staffOverride?: string,
): DemoState {
  const reservation = state.reservations.find((item) => item.id === reservationId);
  if (!reservation) throw new DemoApiError("NOT_FOUND", "That reservation no longer exists.");
  if (["cancelled", "completed", "no_show", "waitlisted"].includes(reservation.status)) {
    throw new DemoApiError("INVALID_TRANSITION", "That booking is not holding a table.");
  }
  const service = getService(reservation.serviceId);
  if (!service) throw new DemoApiError("NOT_FOUND", "That experience is not available.");
  const start = new Date(reservation.startTime);
  const end = new Date(reservation.endTime);
  const selected = validateTableSelection({
    tables: state.tables,
    reservations: state.reservations,
    tableIds,
    start,
    end,
    partySize: reservation.partySize,
    excludeReservationId: reservation.id,
  });
  if (!selected.ok) throw new DemoApiError("TABLE_UNAVAILABLE", selected.reason);
  const actor = staffName(state, staffOverride);
  const updated: Reservation = {
    ...reservation,
    tableIds: selected.allocation.tableIds,
    zone: selected.allocation.zone,
    updatedAt: nowIso(),
  };
  return touch({
    ...state,
    reservations: state.reservations.map((item) => (item.id === reservationId ? updated : item)),
    notifications: [
      notification(
        "customer",
        "status",
        "Your table has been updated",
        `You're now at ${selected.allocation.reason}. Everything else about your booking stays the same.`,
        { customerId: reservation.customerId, reservationId },
      ),
      ...state.notifications,
    ],
    activity: [
      activity(
        "staff",
        actor,
        `reassigned ${reservation.guestName} to ${selected.allocation.reason}.`,
        reservationId,
      ),
      ...state.activity,
    ],
  });
}

const STATUS_TRANSITIONS: Record<Reservation["status"], Reservation["status"][]> = {
  pending: ["confirmed", "cancelled", "no_show"],
  confirmed: ["checked_in", "cancelled", "no_show"],
  checked_in: ["seated", "completed", "cancelled"],
  seated: ["completed"],
  completed: [],
  cancelled: [],
  no_show: [],
  waitlisted: ["cancelled"],
};

export function setReservationStatus(
  state: DemoState,
  reservationId: string,
  status: Reservation["status"],
  staffOverride?: string,
): MutationResult {
  const reservation = state.reservations.find((item) => item.id === reservationId);
  if (!reservation) throw new DemoApiError("NOT_FOUND", "That reservation no longer exists.");
  if (!STATUS_TRANSITIONS[reservation.status].includes(status)) {
    throw new DemoApiError(
      "INVALID_TRANSITION",
      `A ${reservation.status.replace("_", " ")} booking cannot move to ${status.replace("_", " ")}.`,
    );
  }
  const service = getService(reservation.serviceId);
  const actor = staffName(state, staffOverride);
  const updated: Reservation = { ...reservation, status, updatedAt: nowIso() };
  let notifications = state.notifications;
  if (status === "confirmed") {
    notifications = [
      notification(
        "customer",
        "booking",
        "Your request is confirmed",
        `${service?.name ?? "Your table"} is confirmed for ${reservation.partySize}. Reference ${reservation.reference}.`,
        { customerId: reservation.customerId, reservationId },
      ),
      ...notifications,
    ];
  }
  if (status === "checked_in") {
    notifications = [
      notification(
        "customer",
        "status",
        "You're checked in",
        `Welcome in. The host has your table and will seat you shortly. Reference ${reservation.reference}.`,
        { customerId: reservation.customerId, reservationId },
      ),
      ...notifications,
    ];
  }
  if (status === "seated") {
    notifications = [
      notification(
        "customer",
        "status",
        "Your table is ready",
        `You're seated — enjoy Harbor Lane. Your server has the full booking notes.`,
        { customerId: reservation.customerId, reservationId },
      ),
      ...notifications,
    ];
  }
  if (status === "completed") {
    notifications = [
      notification(
        "customer",
        "status",
        "Thanks for visiting",
        `We hope tonight felt easy. Your table is released and your visit is on your Harbor Lane history.`,
        { customerId: reservation.customerId, reservationId },
      ),
      ...notifications,
    ];
  }
  if (status === "cancelled") {
    notifications = [
      notification(
        "customer",
        "status",
        "Your reservation was cancelled",
        `Reference ${reservation.reference} is cancelled and the table has been released. No charge was made.`,
        { customerId: reservation.customerId, reservationId },
      ),
      ...notifications,
    ];
  }
  if (status === "no_show") {
    notifications = [
      notification(
        "customer",
        "status",
        "We missed you tonight",
        `We held your table at Harbor Lane. If plans changed, you can book again any time.`,
        { customerId: reservation.customerId, reservationId },
      ),
      ...notifications,
    ];
  }

  let reservations = state.reservations.map((item) =>
    item.id === reservationId ? updated : item,
  );
  let waitlist = state.waitlist;
  if (status === "cancelled" && reservation.waitlistEntryId) {
    waitlist = waitlist.map((entry) =>
      entry.id === reservation.waitlistEntryId ? { ...entry, status: "cancelled" } : entry,
    );
  }

  let nextState: DemoState = {
    ...state,
    reservations,
    waitlist,
    notifications,
    activity: [
      activity(
        "staff",
        actor,
        `${status === "checked_in" ? "checked in" : status === "no_show" ? "marked no-show" : status.replace("_", " ")} ${reservation.guestName} · ${reservation.reference}.`,
        reservationId,
      ),
      ...state.activity,
    ],
  };

  let promoted: Reservation[] = [];
  if (
    (status === "cancelled" || status === "no_show") &&
    state.settings.autoPromoteWaitlist
  ) {
    const result = promoteWaiting(nextState, staffOverride);
    reservations = result.reservations;
    waitlist = result.waitlist;
    notifications = result.notifications;
    promoted = result.promoted;
    nextState = {
      ...nextState,
      reservations,
      waitlist,
      notifications,
      activity: result.activity,
    };
  }

  return { state: touch(nextState), promoted };
}

export function cancelReservation(
  state: DemoState,
  reservationId: string,
  staffOverride?: string,
): MutationResult {
  const reservation = state.reservations.find((item) => item.id === reservationId);
  if (!reservation) throw new DemoApiError("NOT_FOUND", "That reservation no longer exists.");
  if (["cancelled", "completed", "no_show"].includes(reservation.status)) {
    throw new DemoApiError("INVALID_TRANSITION", "That booking is already closed.");
  }
  const byStaff = Boolean(staffOverride);
  const actor = staffOverride ?? reservation.guestName;
  const isWaitlist = reservation.status === "waitlisted";
  const updated: Reservation = { ...reservation, status: "cancelled", updatedAt: nowIso() };
  let waitlist = state.waitlist;
  if (reservation.waitlistEntryId) {
    waitlist = waitlist.map((entry) =>
      entry.id === reservation.waitlistEntryId ? { ...entry, status: "cancelled" } : entry,
    );
  }
  let nextState: DemoState = {
    ...state,
    reservations: state.reservations.map((item) =>
      item.id === reservationId ? updated : item,
    ),
    waitlist,
    notifications: [
      notification(
        "customer",
        "status",
        isWaitlist ? "You've left the waitlist" : "Your reservation was cancelled",
        isWaitlist
          ? "No charge, no commitment. You can rejoin whenever you like."
          : `Reference ${reservation.reference} is cancelled and the table has been released. No charge was made.`,
        { customerId: reservation.customerId, reservationId },
      ),
      ...state.notifications,
    ],
    activity: [
      activity(
        isWaitlist || !byStaff ? "customer" : "staff",
        actor,
        isWaitlist
          ? `left the waitlist for ${getService(reservation.serviceId)?.name ?? "a table"}.`
          : byStaff
            ? `cancelled ${reservation.guestName}'s booking ${reservation.reference}.`
            : `cancelled their booking ${reservation.reference}.`,
        reservationId,
      ),
      ...state.activity,
    ],
  };

  let promoted: Reservation[] = [];
  if (!isWaitlist && state.settings.autoPromoteWaitlist) {
    const result = promoteWaiting(nextState, staffOverride);
    promoted = result.promoted;
    nextState = {
      ...nextState,
      reservations: result.reservations,
      waitlist: result.waitlist,
      notifications: result.notifications,
      activity: result.activity,
    };
  }
  return { state: touch(nextState), promoted };
}

export function setTableStatus(
  state: DemoState,
  tableId: string,
  status: RestaurantTable["status"],
  staffOverride?: string,
): DemoState {
  const table = state.tables.find((item) => item.id === tableId);
  if (!table) throw new DemoApiError("NOT_FOUND", "That table does not exist.");
  if (status === "maintenance") {
    const nowMs = new Date(state.demoNow).getTime();
    const occupied = state.reservations.find((reservation) => {
      if (!reservation.tableIds.includes(table.id)) return false;
      if (!["checked_in", "seated"].includes(reservation.status)) return false;
      return (
        new Date(reservation.startTime).getTime() <= nowMs &&
        new Date(reservation.endTime).getTime() > nowMs
      );
    });
    if (occupied) {
      throw new DemoApiError(
        "INVALID_TRANSITION",
        `${table.tableNumber} is currently occupied by ${occupied.guestName}. Complete the visit or reassign the party first.`,
      );
    }
  }
  const actor = staffName(state, staffOverride);
  const nextTables = state.tables.map((item) =>
    item.id === tableId ? { ...item, status } : item,
  );
  const isOffline = status === "maintenance";
  return touch({
    ...state,
    tables: nextTables,
    notifications: isOffline
      ? [
          notification(
            "enterprise",
            "insight",
            `${table.tableNumber} moved to maintenance`,
            `${actor} took ${table.zone.replace("_", " ")} ${table.tableNumber} offline. The smart allocator will skip it until it is returned to service.`,
          ),
          ...state.notifications,
        ]
      : state.notifications,
    activity: [
      activity(
        "staff",
        actor,
        isOffline
          ? `took ${table.tableNumber} offline for maintenance.`
          : `returned ${table.tableNumber} to service.`,
      ),
      ...state.activity,
    ],
  });
}

export function sendReminder(
  state: DemoState,
  reservationId: string,
  staffOverride?: string,
): DemoState {
  const reservation = state.reservations.find((item) => item.id === reservationId);
  if (!reservation) throw new DemoApiError("NOT_FOUND", "That reservation no longer exists.");
  if (!["pending", "confirmed", "checked_in"].includes(reservation.status)) {
    throw new DemoApiError("INVALID_TRANSITION", "There is nothing to remind this guest about.");
  }
  const service = getService(reservation.serviceId);
  const actor = staffName(state, staffOverride);
  return touch({
    ...state,
    reservations: state.reservations.map((item) =>
      item.id === reservationId ? { ...item, reminderSentAt: nowIso() } : item,
    ),
    notifications: [
      notification(
        "customer",
        "reminder",
        "A reminder from Harbor Lane",
        `${service?.name ?? "Your table"} · ${new Date(reservation.startTime).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} at ${new Date(reservation.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}. Reference ${reservation.reference}. Reply to this message if plans changed.`,
        { customerId: reservation.customerId, reservationId },
      ),
      ...state.notifications,
    ],
    activity: [
      activity("staff", actor, `sent a reminder to ${reservation.guestName}.`, reservationId),
      ...state.activity,
    ],
  });
}

export function messageConcierge(
  state: DemoState,
  customerId: string,
  message: string,
): DemoState {
  const customer = state.customers.find((item) => item.id === customerId);
  if (!customer) throw new DemoApiError("NOT_FOUND", "That guest profile was not found.");
  const trimmed = message.trim();
  if (trimmed.length < 2) {
    throw new DemoApiError("INVALID_INPUT", "Add a short message for the team.");
  }
  if (trimmed.length > 800) {
    throw new DemoApiError("INVALID_INPUT", "Keep the message under 800 characters.");
  }
  return touch({
    ...state,
    notifications: [
      notification(
        "enterprise",
        "message",
        `Message from ${customer.name}`,
        trimmed,
        { customerId: customer.id },
      ),
      notification(
        "customer",
        "message",
        "The Harbor Lane team has your message",
        "A host will reply by phone or email. For anything urgent, call the floor directly.",
        { customerId: customer.id },
      ),
      ...state.notifications,
    ],
    activity: [
      activity("customer", customer.name, "messaged the floor team.", undefined),
      ...state.activity,
    ],
  });
}

export function markNotificationRead(state: DemoState, notificationId: string): DemoState {
  return touch({
    ...state,
    notifications: state.notifications.map((item) =>
      item.id === notificationId ? { ...item, read: true } : item,
    ),
  });
}

export function markAllCustomerNotificationsRead(
  state: DemoState,
  customerId: string,
): DemoState {
  return touch({
    ...state,
    notifications: state.notifications.map((item) =>
      item.audience === "customer" && item.customerId === customerId
        ? { ...item, read: true }
        : item,
    ),
  });
}

export function setActiveCustomer(state: DemoState, customerId: string): DemoState {
  if (!state.customers.some((customer) => customer.id === customerId)) return state;
  return touch({ ...state, activeCustomerId: customerId });
}

export function setActiveOpsPersona(state: DemoState, personaId: string): DemoState {
  if (!OPS_PERSONAS.some((persona) => persona.id === personaId)) return state;
  return touch({ ...state, activeOpsPersonaId: personaId });
}

export function waitlistDelayLabel(entry: WaitlistEntry): string {
  const start = combineDateTime(entry.desiredDate, entry.desiredFrom);
  const current = new Date();
  const minutes = Math.round((start.getTime() - current.getTime()) / 60_000);
  if (minutes <= 0) return "Now";
  if (minutes < 60) return `${minutes} min`;
  return `${Math.round(minutes / 60)} hr`;
}

export function availableAddOns(serviceId: string) {
  const service = getService(serviceId);
  if (!service) return [];
  return ADD_ONS.filter((addOn) => service.addOnIds.includes(addOn.id));
}
