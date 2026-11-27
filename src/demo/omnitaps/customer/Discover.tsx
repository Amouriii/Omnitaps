import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Clock,
  Coffee,
  CreditCard,
  Gift,
  MapPin,
  Sparkles,
  Star,
  Users,
  Wifi,
} from "lucide-react";
import { ZONE_LABELS } from "../constants";
import { nextAvailableForService, tableLabelForIds } from "../smart";
import { addDaysKey, formatDate, formatMoney, formatTime, localDateKey } from "../time";
import { customerReservations, useDemo } from "../store";
import type { DemoState, Reservation, ServiceOffering } from "../types";
import { SectionHeading, StatusPill, cn } from "../ui";

function nextVisit(reservations: Reservation[], demoNow: string) {
  const now = new Date(demoNow).getTime();
  return reservations
    .filter(
      (reservation) =>
        ["confirmed", "pending", "checked_in", "seated"].includes(reservation.status) &&
        new Date(reservation.startTime).getTime() >= now - 60 * 60_000,
    )
    .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
}

function waitlistVisit(reservations: Reservation[]) {
  return reservations
    .filter((reservation) => reservation.status === "waitlisted")
    .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
}

function availabilityLabel(state: DemoState, service: ServiceOffering): string {
  const party = Math.max(2, service.minPartySize);
  const option = nextAvailableForService(state, service.id, party);
  if (!option) return "Waitlist only";
  const dateKey = localDateKey(option.startTime);
  const todayKey = localDateKey(state.demoNow);
  if (dateKey === todayKey) return `Today · ${formatTime(option.startTime)}`;
  const tomorrow = addDaysKey(todayKey, 1);
  if (dateKey === tomorrow) return `Tomorrow · ${formatTime(option.startTime)}`;
  return `${formatDate(option.startTime, true)} · ${formatTime(option.startTime)}`;
}

export default function Discover({
  onBook,
  onViewReservations,
  onOpenUpdates,
}: {
  onBook: (serviceId?: string) => void;
  onViewReservations: () => void;
  onOpenUpdates: () => void;
}) {
  const { state, customer } = useDemo();
  const reservationList = useMemo(
    () => customerReservations(state, customer.id),
    [customer.id, state],
  );
  const next = nextVisit(reservationList, state.demoNow);
  const waitlisted = waitlistVisit(reservationList);
  const unread = state.notifications.filter(
    (notification) =>
      notification.audience === "customer" &&
      notification.customerId === customer.id &&
      !notification.read,
  ).length;

  return (
    <div>
      <section className="ot-hero-customer relative overflow-hidden border-b border-hairline">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="ot-reveal">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-surface/70 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-muted">
                <span className="ot-live-dot h-1.5 w-1.5 rounded-full bg-tap text-tap" aria-hidden="true" />
                Live availability
              </span>
              <span className="rounded-full border border-brass/30 bg-brass-soft/80 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-brass-dark">
                Smart reservations
              </span>
            </div>
            <h1 className="mt-5 max-w-xl font-display text-[42px] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-[56px]">
              Your table,
              <br />
              already waiting.
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-[1.75] text-ink-muted">
              Harbor Lane seats you by party size, room and the rhythm of service — not by who
              refreshes the page fastest. Choose an experience, pick a sitting, and let the floor
              put the right table aside.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onBook()}
                className="cafe-btn inline-flex items-center gap-2 rounded-full bg-tap px-5 py-3 text-[13.5px] font-semibold text-white shadow-[0_18px_30px_-18px_rgba(196,92,38,0.8)] hover:bg-tap-dark"
              >
                Reserve a table
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => document.getElementById("experiences")?.scrollIntoView({ behavior: "smooth" })}
                className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-surface/60 px-5 py-3 text-[13.5px] font-semibold text-ink transition hover:border-ink/30 hover:bg-surface"
              >
                Explore experiences
              </button>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[11.5px] text-ink-muted">
              <span className="inline-flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
                Instant confirmation
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
                No prepayment
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
                Free self-service changes
              </span>
            </div>
          </div>

          <div className="ot-reveal" style={{ animationDelay: "90ms" }}>
            <NextVisitCard
              state={state}
              next={next}
              waitlisted={waitlisted}
              onViewReservations={onViewReservations}
              onBook={() => onBook(next?.serviceId)}
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        {unread > 0 ? (
          <button
            type="button"
            onClick={onOpenUpdates}
            className="mb-8 flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-brass/30 bg-brass-soft/60 px-4 py-3 text-left transition hover:border-brass/60"
          >
            <span className="flex items-center gap-2.5 text-[13px] text-ink">
              <Bell className="h-4 w-4 text-brass-dark" aria-hidden="true" />
              <span>
                <span className="font-semibold">{unread} new update{unread === 1 ? "" : "s"}</span>{" "}
                from the Harbor Lane floor.
              </span>
            </span>
            <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-brass-dark">
              Open updates <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </span>
          </button>
        ) : null}

        <div id="experiences" className="scroll-mt-24">
          <SectionHeading
            eyebrow="Choose your sitting"
            title="Experiences at Harbor Lane"
            description="Every experience has its own room, pace and table mix. Availability below is live against the floor's real table plan."
            actions={
              <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                {state.tables.filter((table) => table.isActive && table.status !== "maintenance").length} tables in service
              </span>
            }
          />

          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {state.services.map((service) => (
              <ServiceCard
                key={service.id}
                state={state}
                service={service}
                onBook={() => onBook(service.id)}
              />
            ))}
          </div>
        </div>

        <section className="mt-14 rounded-3xl border border-hairline bg-surface/70 p-5 sm:p-8">
          <SectionHeading
            eyebrow="Why it feels easy"
            title="Smart, not busy"
            description="The same allocation rules the floor uses at service, applied before you press confirm."
          />
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: Users,
                title: "Best-fit tables",
                body: "Party size, zone preference and turn time are scored together, so a two-top doesn't swallow a six-top.",
              },
              {
                icon: Sparkles,
                title: "A waitlist that moves",
                body: "When a table is released, the first matching waitlist guest is auto-offered the seat — VIPs included.",
              },
              {
                icon: Bell,
                title: "Live with the floor",
                body: "Check-in, seating and table changes land in your updates immediately. No calling to ask.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border border-hairline bg-porcelain/60 p-5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-tap-soft text-tap">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-display text-[18px] font-semibold">{item.title}</h3>
                  <p className="mt-2 text-[13px] leading-[1.7] text-ink-muted">{item.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-10 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="cafe-final-cta relative overflow-hidden rounded-3xl border border-ink/15 bg-ink px-6 py-8 text-[#faf4ea] sm:px-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">Private salon</p>
            <h2 className="mt-3 max-w-md font-display text-[28px] font-semibold leading-tight sm:text-[34px]">
              A room of your own, six to twelve guests.
            </h2>
            <p className="mt-3 max-w-md text-[13.5px] leading-[1.7] text-white/65">
              A dedicated host, a family-style menu and a door that closes. The salon is allocated
              separately so it never gets double-booked.
            </p>
            <button
              type="button"
              onClick={() => onBook("svc_private")}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-brass px-5 py-2.5 text-[13px] font-semibold text-ink transition hover:bg-brass-soft"
            >
              Plan a private dinner
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="rounded-3xl border border-hairline bg-surface/70 p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-tap">Around your visit</p>
            <h2 className="mt-2 font-display text-[22px] font-semibold">Everything else, one tap away</h2>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              {[
                { to: "/menu/demo", label: "Menu", icon: Coffee },
                { to: "/r/demo/wifi", label: "Guest Wi‑Fi", icon: Wifi },
                { to: "/demo/loyalty", label: "Loyalty", icon: Gift },
                { to: "/demo/wallet", label: "Member pass", icon: CreditCard },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="group flex items-center gap-2.5 rounded-xl border border-hairline bg-porcelain/60 px-3 py-3 text-[12.5px] font-medium transition hover:border-tap/40 hover:bg-tap-soft/50"
                  >
                    <Icon className="h-4 w-4 text-tap" aria-hidden="true" />
                    {item.label}
                    <ArrowRight className="ml-auto h-3 w-3 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-tap" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-[11px] text-ink-muted">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              14 Harbor Lane · open daily 09:00–22:00
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function ServiceCard({
  state,
  service,
  onBook,
}: {
  state: DemoState;
  service: ServiceOffering;
  onBook: () => void;
}) {
  const availability = availabilityLabel(state, service);
  return (
    <article className="cafe-card-hover group relative flex flex-col overflow-hidden rounded-3xl border border-hairline bg-surface shadow-[0_18px_40px_-32px_rgba(44,27,18,0.45)]">
      <div className="h-1.5 w-full" style={{ backgroundColor: service.accent }} aria-hidden="true" />
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {service.badge ? (
              <span className="inline-flex rounded-full border border-brass/30 bg-brass-soft px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-brass-dark">
                {service.badge}
              </span>
            ) : null}
            <h3 className="mt-2.5 font-display text-[22px] font-semibold leading-tight tracking-[-0.02em]">
              {service.name}
            </h3>
            <p className="mt-1 text-[12px] italic text-ink-muted">{service.tagline}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-[20px] font-semibold">{formatMoney(service.priceCents)}</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
              per guest
            </p>
          </div>
        </div>

        <p className="mt-3 line-clamp-3 text-[13px] leading-[1.7] text-ink-muted">
          {service.description}
        </p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {service.highlights.slice(0, 2).map((highlight) => (
            <span
              key={highlight}
              className="rounded-full border border-hairline bg-porcelain/70 px-2.5 py-1 text-[10.5px] text-ink-muted"
            >
              {highlight}
            </span>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {service.durationMinutes} min
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {ZONE_LABELS[service.zone]}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            {service.minPartySize === service.maxPartySize
              ? `${service.maxPartySize} guests`
              : `${service.minPartySize}–${service.maxPartySize}`}
          </span>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-medium",
              availability === "Waitlist only"
                ? "bg-brass-soft text-brass-dark"
                : "bg-emerald-50 text-emerald-800",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                availability === "Waitlist only" ? "bg-brass" : "bg-emerald-500",
              )}
              aria-hidden="true"
            />
            {availability === "Waitlist only" ? "Waitlist only" : `Next table · ${availability}`}
          </span>
          <button
            type="button"
            onClick={onBook}
            className="cafe-btn inline-flex items-center gap-1.5 rounded-full bg-tap px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-tap-dark"
          >
            Reserve
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}

function NextVisitCard({
  state,
  next,
  waitlisted,
  onViewReservations,
  onBook,
}: {
  state: DemoState;
  next: Reservation | undefined;
  waitlisted: Reservation | undefined;
  onViewReservations: () => void;
  onBook: () => void;
}) {
  if (!next && !waitlisted) {
    return (
      <div className="ot-ticket rounded-[28px] border border-hairline bg-surface/85 p-6 shadow-[0_24px_60px_-40px_rgba(44,27,18,0.4)]">
        <span className="ot-ticket-notch ot-ticket-notch--left" aria-hidden="true" />
        <span className="ot-ticket-notch ot-ticket-notch--right" aria-hidden="true" />
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-tap">Your next visit</p>
        <h2 className="mt-3 font-display text-[28px] font-semibold leading-tight">
          Nothing on the books.
          <br />
          <span className="text-tap">Let's fix that.</span>
        </h2>
        <p className="mt-3 text-[13px] leading-[1.7] text-ink-muted">
          Pick an experience and we'll match a table to your party, the room and the time you want.
        </p>
        <button
          type="button"
          onClick={onBook}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-tap px-5 py-2.5 text-[13px] font-semibold text-white"
        >
          Find a table <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  const reservation = next ?? waitlisted;
  if (!reservation) return null;
  const service = state.services.find((entry) => entry.id === reservation.serviceId);
  const date = new Date(reservation.startTime);
  const month = date.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const day = String(date.getDate());
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });

  return (
    <div className="ot-ticket relative rounded-[28px] border border-hairline bg-surface/90 p-5 shadow-[0_28px_70px_-44px_rgba(44,27,18,0.5)] sm:p-6">
      <span className="ot-ticket-notch ot-ticket-notch--left" aria-hidden="true" />
      <span className="ot-ticket-notch ot-ticket-notch--right" aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-tap">
            {reservation.status === "waitlisted" ? "On the smart waitlist" : "Your next visit"}
          </p>
          <p className="mt-1 text-[12px] text-ink-muted">
            {reservation.status === "waitlisted"
              ? "We'll auto-offer the first matching table."
              : "Held by the floor's smart allocation."}
          </p>
        </div>
        <StatusPill status={reservation.status} />
      </div>

      <div className="mt-5 flex items-stretch gap-4">
        <div className="flex w-[72px] shrink-0 flex-col items-center justify-center rounded-2xl border border-hairline bg-porcelain/80 py-3">
          <span className="font-mono text-[9px] tracking-[0.16em] text-tap">{month}</span>
          <span className="font-display text-[30px] font-semibold leading-none">{day}</span>
          <span className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
            {weekday}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[21px] font-semibold leading-tight tracking-[-0.02em]">
            {service?.name ?? "Harbor Lane"}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-muted">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {formatTime(reservation.startTime)} · {reservation.partySize} guests
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-muted">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {reservation.status === "waitlisted"
              ? "Table auto-match pending"
              : `${tableLabelForIds(reservation.tableIds, state.tables)} · ${reservation.zone ? ZONE_LABELS[reservation.zone] : "Harbor Lane"}`}
          </p>
        </div>
      </div>

      <div className="ot-dashed-rule mt-5 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
            Ref {reservation.reference}
          </p>
          <button
            type="button"
            onClick={onViewReservations}
            className="inline-flex items-center gap-1.5 rounded-full border border-tap/30 bg-tap-soft/60 px-3.5 py-2 text-[12px] font-semibold text-tap-dark transition hover:border-tap/60 hover:bg-tap-soft"
          >
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            {reservation.status === "waitlisted" ? "Track waitlist" : "View pass & details"}
          </button>
        </div>
      </div>
      {next && next.status === "checked_in" ? (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
          You're checked in — the host will walk you to your table.
        </p>
      ) : null}
      {next && next.status === "seated" ? (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
          You're seated. Enjoy Harbor Lane.
        </p>
      ) : null}
    </div>
  );
}
