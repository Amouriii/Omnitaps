import {
  ADD_ONS,
  BUFFER_MINUTES,
  CUSTOMER_PERSONAS,
  ENTERPRISE,
  GUEST_POOL,
  LEAD_MINUTES,
  OPS_PERSONAS,
  SERVICES,
  TABLES,
  getService,
} from "./constants";
import { calculateBookingPrice } from "./pricing";
import {
  findBestTableAllocation,
  reservationDuration,
  serviceIsOpenAt,
} from "./smart";
import {
  addDaysKey,
  addMinutes,
  combineDateTime,
  localDateKey,
  minutesToTime,
  resolveDemoMoment,
  timeToMinutes,
} from "./time";
import type {
  ActivityEntry,
  Customer,
  DemoNotification,
  DemoState,
  Reservation,
  ReservationSource,
  ReservationStatus,
  ServiceOffering,
  WaitlistEntry,
} from "./types";

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return function random() {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, values: T[]): T {
  return values[Math.floor(rng() * values.length)] as T;
}

function chance(rng: () => number, probability: number): boolean {
  return rng() < probability;
}

interface SeedContext {
  demoNow: Date;
  todayKey: string;
  reservations: Reservation[];
  waitlist: WaitlistEntry[];
  notifications: DemoNotification[];
  activity: ActivityEntry[];
  referenceCounter: number;
  notificationCounter: number;
  activityCounter: number;
}

interface ReservationSeed {
  dateKey: string;
  time: string;
  serviceId: string;
  partySize: number;
  customerId: string;
  status: ReservationStatus;
  addOnIds?: string[];
  specialRequests?: string;
  source?: ReservationSource;
  vip?: boolean;
  createdAt?: string;
  updatedAt?: string;
  internalNote?: string;
}

function nextReference(ctx: SeedContext, prefix = "HL"): string {
  ctx.referenceCounter += 1;
  return `${prefix}-${String(ctx.referenceCounter).padStart(4, "0")}`;
}

function customerFor(customerId: string): Customer {
  return (
    CUSTOMER_PERSONAS.find((customer) => customer.id === customerId) ??
    GUEST_POOL.find((customer) => customer.id === customerId) ??
    CUSTOMER_PERSONAS[0]
  );
}

function buildReservation(
  ctx: SeedContext,
  input: ReservationSeed,
  forcedReference?: string,
): Reservation | null {
  const service = getService(input.serviceId);
  if (!service) return null;
  const customer = customerFor(input.customerId);
  const start = combineDateTime(input.dateKey, input.time);
  const duration = reservationDuration(service, input.partySize, start);
  const end = new Date(start.getTime() + duration * 60_000);
  const addOnIds = (input.addOnIds ?? []).filter((id) => service.addOnIds.includes(id));
  const price = calculateBookingPrice(service, input.partySize, addOnIds);

  // Seeded history should not stack two parties on one table at the same
  // time, even when the row later becomes completed, cancelled, or a no-show.
  // Treat every seeded table assignment as held for allocation purposes.
  const seedReservations = ctx.reservations.map((reservation) =>
    reservation.tableIds.length > 0
      ? { ...reservation, status: "confirmed" as const }
      : reservation,
  );

  // Seed data first tries the service's natural zone, then any zone so
  // historical rows still get a believable table.
  const allocation = findBestTableAllocation({
    tables: TABLES,
    reservations: seedReservations,
    start,
    end,
    partySize: input.partySize,
    preferredZone: service.zone,
    bufferMinutes: BUFFER_MINUTES,
  });

  if (!allocation) return null;

  const reference = forcedReference ?? nextReference(ctx, "HL");
  const reservation: Reservation = {
    id: `res_${reference}`,
    reference,
    enterpriseId: ENTERPRISE.id,
    customerId: customer.id,
    guestName: customer.name,
    guestEmail: customer.email,
    guestPhone: customer.phone,
    serviceId: service.id,
    tableIds: allocation.tableIds,
    partySize: input.partySize,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    status: input.status,
    zone: allocation.zone,
    addOnIds,
    specialRequests: input.specialRequests ?? "",
    vip: input.vip ?? customer.vip,
    source: input.source ?? "web",
    totalCents: price.totalCents,
    createdAt: input.createdAt ?? addMinutes(start, -60 * 30).toISOString(),
    updatedAt: input.updatedAt ?? start.toISOString(),
    reminderSentAt: null,
    internalNote: input.internalNote,
  };
  ctx.reservations.push(reservation);
  return reservation;
}

function serviceCandidatesAt(
  start: Date,
  partySize: number,
  preferredIds: string[],
): ServiceOffering[] {
  const open = SERVICES.filter(
    (service) =>
      serviceIsOpenAt(service, start) &&
      partySize >= service.minPartySize &&
      partySize <= service.maxPartySize,
  );
  const preferred = preferredIds
    .map((id) => getService(id))
    .filter((service): service is ServiceOffering => Boolean(service))
    .filter((service) => open.some((entry) => entry.id === service.id));
  return preferred.length ? preferred : open;
}

function randomTimeInService(rng: () => number, service: ServiceOffering): string {
  const open = timeToMinutes(service.openTime);
  const last = Math.max(open, timeToMinutes(service.closeTime) - service.durationMinutes);
  const steps = Math.floor((last - open) / service.slotMinutes);
  const step = Math.floor(rng() * (steps + 1));
  return minutesToTime(open + step * service.slotMinutes);
}

function seedHistory(ctx: SeedContext): void {
  for (let offset = 14; offset >= 1; offset -= 1) {
    const dateKey = addDaysKey(ctx.todayKey, -offset);
    const rng = mulberry32(9_100 + offset * 17);
    const count = 7 + Math.floor(rng() * 5);
    for (let index = 0; index < count; index += 1) {
      const customer =
        index % 4 === 0
          ? CUSTOMER_PERSONAS[index % CUSTOMER_PERSONAS.length]
          : pick(rng, GUEST_POOL);
      const service = pick(rng, SERVICES);
      const partySize = Math.min(
        Math.max(1 + Math.floor(rng() * 5), service.minPartySize),
        service.maxPartySize,
      );
      const time = randomTimeInService(rng, service);
      const roll = rng();
      const status: ReservationStatus =
        roll < 0.855 ? "completed" : roll < 0.925 ? "no_show" : "cancelled";
      const addOns = chance(rng, 0.34)
        ? service.addOnIds.filter(() => chance(rng, 0.4))
        : [];
      const start = combineDateTime(dateKey, time);
      const createdAt = addMinutes(start, -60 * (8 + Math.floor(rng() * 40))).toISOString();
      buildReservation(ctx, {
        dateKey,
        time,
        serviceId: service.id,
        partySize,
        customerId: customer?.id ?? "cus_maya",
        status,
        addOnIds: addOns,
        specialRequests: chance(rng, 0.22)
          ? pick(rng, [
              "Quiet corner if possible.",
              "Celebrating a birthday — a candle would be lovely.",
              "One guest is vegetarian.",
              "High chair needed.",
              "Nut allergy at the table.",
            ])
          : "",
        source: pick<ReservationSource>(rng, ["web", "web", "phone", "walk_in", "concierge"]),
        vip: customer?.vip ?? false,
        createdAt,
        updatedAt: new Date(start.getTime() + 60 * 60_000).toISOString(),
      });
    }
  }
}

function seedToday(ctx: SeedContext): void {
  const fixed = [
    {
      offset: -150,
      status: "cancelled" as const,
      customerId: "cus_salma",
      party: 4,
      hints: ["svc_coffee", "svc_brunch"],
      note: "Cancelled by the guest — table released.",
    },
    {
      offset: -120,
      status: "completed" as const,
      customerId: "cus_karim",
      party: 2,
      hints: ["svc_coffee", "svc_brunch"],
      note: "Paid at the table.",
    },
    {
      offset: -75,
      status: "no_show" as const,
      customerId: "cus_tarek",
      party: 2,
      hints: ["svc_brunch", "svc_tea"],
      note: "Called twice; no answer.",
    },
    {
      offset: -40,
      status: "checked_in" as const,
      customerId: "cus_youssef",
      party: 2,
      hints: ["svc_chef", "svc_supper", "svc_sundown", "svc_brunch"],
      note: "VIP — greet by name and offer the window bar.",
      special: "Window bar if possible. Still water, no ice.",
      vip: true,
    },
    {
      offset: -12,
      status: "seated" as const,
      customerId: "cus_hana",
      party: 4,
      hints: ["svc_supper", "svc_brunch", "svc_sundown"],
      note: "Nut allergy flagged at check-in.",
      special: "Nut allergy at the table. Please confirm with the kitchen.",
    },
    {
      offset: 25,
      status: "confirmed" as const,
      customerId: "cus_dina",
      party: 4,
      hints: ["svc_sundown", "svc_supper", "svc_tea"],
      note: "VIP — celebrating a promotion.",
      special: "Celebrating a promotion — a candle on dessert would be perfect.",
      vip: true,
    },
    {
      offset: 55,
      status: "confirmed" as const,
      customerId: "cus_farah",
      party: 2,
      hints: ["svc_tea", "svc_sundown", "svc_supper"],
      note: "",
    },
    {
      offset: 85,
      status: "pending" as const,
      customerId: "cus_omar",
      party: 2,
      hints: ["svc_supper", "svc_brunch", "svc_sundown"],
      note: "Quiet corner requested.",
      special: "Quiet corner if possible.",
    },
    {
      offset: 115,
      status: "confirmed" as const,
      customerId: "cus_maya",
      party: 2,
      hints: ["svc_supper", "svc_tea", "svc_sundown"],
      note: "VIP — anniversary. Confirm the cake with pastry.",
      special: "Anniversary dinner. A quiet corner and a candle would mean a lot.",
      vip: true,
    },
    {
      offset: 145,
      status: "confirmed" as const,
      customerId: "cus_ziad",
      party: 6,
      hints: ["svc_private", "svc_supper", "svc_sundown"],
      note: "Large party — private salon preferred.",
      special: "Six guests, one vegetarian. Celebration dinner.",
    },
  ];

  for (const entry of fixed) {
    const start = addMinutes(ctx.demoNow, entry.offset);
    if (localDateKey(start) !== ctx.todayKey) continue;
    const candidates = serviceCandidatesAt(start, entry.party, entry.hints);
    for (const service of candidates) {
      const time = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
      const created = addMinutes(start, -60 * (entry.offset < 0 ? 20 : 48));
      const reservation = buildReservation(ctx, {
        dateKey: ctx.todayKey,
        time,
        serviceId: service.id,
        partySize: entry.party,
        customerId: entry.customerId,
        status: entry.status,
        specialRequests: entry.special ?? "",
        source: chance(mulberry32(entry.offset + 400), 0.5) ? "web" : "phone",
        vip: entry.vip ?? false,
        createdAt: created.toISOString(),
        updatedAt:
          entry.status === "completed" || entry.status === "seated" || entry.status === "checked_in"
            ? start.toISOString()
            : created.toISOString(),
        internalNote: entry.note,
        addOnIds: entry.customerId === "cus_maya" ? ["add_cake", "add_quiet"] : [],
      });
      if (reservation) break;
    }
  }

  const mayaReservation = ctx.reservations.find(
    (reservation) =>
      reservation.customerId === "cus_maya" &&
      reservation.status === "confirmed" &&
      localDateKey(reservation.startTime) === ctx.todayKey,
  );
  if (mayaReservation) {
    ctx.notifications.push({
      id: `ntf_${(ctx.notificationCounter += 1)}`,
      audience: "customer",
      customerId: "cus_maya",
      kind: "booking",
      title: "Your anniversary table is confirmed",
      body: `Harbor Lane is holding a table for two at ${new Date(mayaReservation.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}. We've noted the cake and quiet corner.`,
      createdAt: addMinutes(ctx.demoNow, -60 * 26).toISOString(),
      read: false,
      reservationId: mayaReservation.id,
    });
    ctx.notifications.push({
      id: `ntf_${(ctx.notificationCounter += 1)}`,
      audience: "customer",
      customerId: "cus_maya",
      kind: "reminder",
      title: "A little reminder for tonight",
      body: "Your table is confirmed. The terrace is warm, the kitchen has the cake, and your usual window seat is on the list.",
      createdAt: addMinutes(ctx.demoNow, -95).toISOString(),
      read: false,
      reservationId: mayaReservation.id,
    });
  }

  const vipReservation = ctx.reservations.find(
    (reservation) =>
      reservation.vip &&
      reservation.status === "confirmed" &&
      localDateKey(reservation.startTime) === ctx.todayKey,
  );
  if (vipReservation) {
    ctx.notifications.push({
      id: `ntf_${(ctx.notificationCounter += 1)}`,
      audience: "enterprise",
      kind: "insight",
      title: "VIP arrival on the floor",
      body: `${vipReservation.guestName} · party of ${vipReservation.partySize}. ${vipReservation.specialRequests || "No special requests."}`,
      createdAt: addMinutes(ctx.demoNow, -20).toISOString(),
      read: false,
      reservationId: vipReservation.id,
    });
  }
}

function seedWaitlist(ctx: SeedContext): void {
  const tomorrow = addDaysKey(ctx.todayKey, 1);
  const roundedNowPlus = (minutes: number) =>
    minutesToTime(Math.ceil((ctx.demoNow.getHours() * 60 + ctx.demoNow.getMinutes() + minutes) / 15) * 15);
  const entries = [
    {
      customerId: "cus_lina",
      serviceId: "svc_sundown",
      party: 2,
      dateKey: ctx.todayKey,
      time: roundedNowPlus(45),
      zone: "terrace" as const,
      joinedMinutesAgo: 25,
      note: "First visit — would love a terrace table.",
    },
    {
      customerId: "cus_nourhan",
      serviceId: "svc_supper",
      party: 4,
      dateKey: ctx.todayKey,
      time: roundedNowPlus(80),
      zone: "dining_room" as const,
      joinedMinutesAgo: 40,
      note: "Celebrating a graduation.",
    },
    {
      customerId: "cus_tarek",
      serviceId: "svc_supper",
      party: 3,
      dateKey: ctx.todayKey,
      time: roundedNowPlus(115),
      zone: "window_bar" as const,
      joinedMinutesAgo: 55,
      note: "Business dinner; flexible on timing.",
    },
    {
      customerId: "cus_maya",
      serviceId: "svc_chef",
      party: 2,
      dateKey: tomorrow,
      time: "19:30",
      zone: "window_bar" as const,
      joinedMinutesAgo: 12,
      note: "Would take any counter seat; happy to be called.",
    },
  ];

  for (const entrySeed of entries) {
    const customer = customerFor(entrySeed.customerId);
    const start = combineDateTime(entrySeed.dateKey, entrySeed.time);
    const preferred = getService(entrySeed.serviceId);
    const service =
      preferred && serviceIsOpenAt(preferred, start)
        ? preferred
        : serviceCandidatesAt(start, entrySeed.party, [entrySeed.serviceId])[0];
    if (!service) continue;
    const end = new Date(
      start.getTime() + reservationDuration(service, entrySeed.party, start) * 60_000,
    );
    const reference = nextReference(ctx, "HL");
    const waitlistId = `wl_${nextReference(ctx, "WL")}`;
    const price = calculateBookingPrice(service, entrySeed.party, []);
    const reservation: Reservation = {
      id: `res_${reference}`,
      reference,
      enterpriseId: ENTERPRISE.id,
      customerId: customer.id,
      guestName: customer.name,
      guestEmail: customer.email,
      guestPhone: customer.phone,
      serviceId: service.id,
      tableIds: [],
      partySize: entrySeed.party,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      status: "waitlisted",
      zone: entrySeed.zone,
      addOnIds: [],
      specialRequests: entrySeed.note,
      vip: customer.vip,
      source: "web",
      totalCents: price.totalCents,
      createdAt: addMinutes(ctx.demoNow, -entrySeed.joinedMinutesAgo).toISOString(),
      updatedAt: addMinutes(ctx.demoNow, -entrySeed.joinedMinutesAgo).toISOString(),
      reminderSentAt: null,
      waitlistEntryId: waitlistId,
    };
    const entry: WaitlistEntry = {
      id: waitlistId,
      reference: `WL-${reference.split("-")[1]}`,
      enterpriseId: ENTERPRISE.id,
      customerId: customer.id,
      guestName: customer.name,
      guestEmail: customer.email,
      guestPhone: customer.phone,
      serviceId: service.id,
      partySize: entrySeed.party,
      desiredDate: entrySeed.dateKey,
      desiredFrom: entrySeed.time,
      desiredTo: minutesToTime(timeToMinutes(entrySeed.time) + 120),
      preferredZone: entrySeed.zone,
      specialRequests: entrySeed.note,
      vip: customer.vip,
      status: "waiting",
      joinedAt: addMinutes(ctx.demoNow, -entrySeed.joinedMinutesAgo).toISOString(),
      reservationId: reservation.id,
    };
    ctx.reservations.push(reservation);
    ctx.waitlist.push(entry);
    ctx.notifications.push({
      id: `ntf_${(ctx.notificationCounter += 1)}`,
      audience: "customer",
      customerId: customer.id,
      kind: "waitlist",
      title: "You're on the smart waitlist",
      body: `We'll auto-offer you the first matching table for ${service.name}. You can cancel any time and nothing is charged.`,
      createdAt: entry.joinedAt,
      read: false,
      reservationId: reservation.id,
    });
    ctx.notifications.push({
      id: `ntf_${(ctx.notificationCounter += 1)}`,
      audience: "enterprise",
      kind: "waitlist",
      title: `${customer.vip ? "VIP " : ""}Waitlist request`,
      body: `${customer.name} · party of ${entrySeed.party} · ${service.name} · ${entrySeed.time}.`,
      createdAt: entry.joinedAt,
      read: false,
      reservationId: reservation.id,
    });
    ctx.activity.push({
      id: `act_${(ctx.activityCounter += 1)}`,
      at: entry.joinedAt,
      actor: "customer",
      actorName: customer.name,
      message: `joined the waitlist for ${service.name}.`,
      reservationId: reservation.id,
    });
  }
}

function seedUpcoming(ctx: SeedContext): void {
  const plans: Array<{
    dayOffset: number;
    time: string;
    serviceId: string;
    party: number;
    customerId: string;
    note?: string;
  }> = [
    { dayOffset: 1, time: "12:30", serviceId: "svc_brunch", party: 2, customerId: "cus_omar" },
    { dayOffset: 1, time: "15:00", serviceId: "svc_tea", party: 2, customerId: "cus_farah" },
    { dayOffset: 1, time: "19:30", serviceId: "svc_supper", party: 4, customerId: "cus_karim" },
    { dayOffset: 2, time: "13:00", serviceId: "svc_brunch", party: 3, customerId: "cus_salma" },
    { dayOffset: 2, time: "19:00", serviceId: "svc_supper", party: 2, customerId: "cus_maya" },
    { dayOffset: 2, time: "20:00", serviceId: "svc_sundown", party: 2, customerId: "cus_nourhan" },
    { dayOffset: 3, time: "11:00", serviceId: "svc_coffee", party: 1, customerId: "cus_lina" },
    { dayOffset: 3, time: "19:00", serviceId: "svc_chef", party: 2, customerId: "cus_ziad" },
    { dayOffset: 3, time: "20:30", serviceId: "svc_supper", party: 6, customerId: "cus_dina" },
  ];

  for (const plan of plans) {
    const dateKey = addDaysKey(ctx.todayKey, plan.dayOffset);
    const start = combineDateTime(dateKey, plan.time);
    const customer = customerFor(plan.customerId);
    const service = getService(plan.serviceId);
    if (!service || !serviceIsOpenAt(service, start)) continue;
    const reservation = buildReservation(ctx, {
      dateKey,
      time: plan.time,
      serviceId: plan.serviceId,
      partySize: plan.party,
      customerId: plan.customerId,
      status: "confirmed",
      source: "web",
      specialRequests: plan.note ?? "",
      createdAt: addMinutes(ctx.demoNow, -60 * 24 * (plan.dayOffset + 1)).toISOString(),
      updatedAt: addMinutes(ctx.demoNow, -60 * 24 * plan.dayOffset).toISOString(),
      vip: customer.vip,
    });
    if (reservation && plan.customerId === "cus_maya") {
      ctx.notifications.push({
        id: `ntf_${(ctx.notificationCounter += 1)}`,
        audience: "customer",
        customerId: "cus_maya",
        kind: "booking",
        title: "Your next table is booked",
        body: `${service.name} for ${plan.party} on ${new Date(reservation.startTime).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} at ${plan.time}.`,
        createdAt: reservation.createdAt,
        read: true,
        reservationId: reservation.id,
      });
    }
  }
}

function seedActivity(ctx: SeedContext): void {
  const staff = OPS_PERSONAS[0];
  const serviceLead = OPS_PERSONAS[1];
  const entries: Array<{
    minutesAgo: number;
    actor: ActivityEntry["actor"];
    actorName: string;
    message: string;
  }> = [
    {
      minutesAgo: 185,
      actor: "staff",
      actorName: staff?.name ?? "Nour Adel",
      message: "opened the floor and moved T4 into maintenance.",
    },
    {
      minutesAgo: 148,
      actor: "customer",
      actorName: "Salma Nabil",
      message: "cancelled a lunch booking; the table was released automatically.",
    },
    {
      minutesAgo: 96,
      actor: "staff",
      actorName: serviceLead?.name ?? "Karim Saleh",
      message: "checked in Youssef Kamal and flagged the window preference.",
    },
    {
      minutesAgo: 62,
      actor: "staff",
      actorName: staff?.name ?? "Nour Adel",
      message: "seated Hana Sharif and confirmed the nut allergy with the kitchen.",
    },
    {
      minutesAgo: 44,
      actor: "system",
      actorName: "Smart engine",
      message: "matched three waitlist guests to released tables for tonight.",
    },
    {
      minutesAgo: 18,
      actor: "customer",
      actorName: "Maya Hassan",
      message: "added a celebration cake and a quiet-corner request.",
    },
  ];
  for (const entry of entries) {
    ctx.activity.push({
      id: `act_${(ctx.activityCounter += 1)}`,
      at: addMinutes(ctx.demoNow, -entry.minutesAgo).toISOString(),
      actor: entry.actor,
      actorName: entry.actorName,
      message: entry.message,
    });
  }
}

export function createDemoState(): DemoState {
  const demoNow = resolveDemoMoment(new Date());
  const todayKey = localDateKey(demoNow);
  const ctx: SeedContext = {
    demoNow,
    todayKey,
    reservations: [],
    waitlist: [],
    notifications: [],
    activity: [],
    referenceCounter: 1040,
    notificationCounter: 0,
    activityCounter: 0,
  };

  seedHistory(ctx);
  seedToday(ctx);
  seedWaitlist(ctx);
  seedUpcoming(ctx);
  seedActivity(ctx);

  const customers = [
    ...CUSTOMER_PERSONAS,
    ...GUEST_POOL.filter(
      (customer) => !CUSTOMER_PERSONAS.some((persona) => persona.id === customer.id),
    ),
  ];

  return {
    schemaVersion: 1,
    revision: 1,
    updatedAt: new Date().toISOString(),
    seedAnchor: todayKey,
    demoNow: demoNow.toISOString(),
    enterprise: { ...ENTERPRISE },
    customers,
    services: SERVICES.map((service) => ({ ...service })),
    addOns: ADD_ONS.map((addOn) => ({ ...addOn })),
    tables: TABLES.map((table) => ({ ...table, combinableWith: [...table.combinableWith] })),
    reservations: ctx.reservations,
    waitlist: ctx.waitlist,
    notifications: ctx.notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    activity: ctx.activity.sort((a, b) => b.at.localeCompare(a.at)),
    settings: {
      bufferMinutes: BUFFER_MINUTES,
      autoPromoteWaitlist: true,
      acceptWaitlist: true,
      leadMinutes: LEAD_MINUTES,
    },
    activeCustomerId: "cus_maya",
    activeOpsPersonaId: "ops_nour",
  };
}
