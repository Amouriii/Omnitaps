import { useMemo, useState } from "react";
import { CalendarDays, MessageCircle, HelpCircle, Ticket, Mail, Phone, Star } from "lucide-react";
import { customerReservations, useDemo } from "../store";
import { formatDateLong, formatTime } from "../time";
import { cn } from "../ui";
import { tableLabelForIds, reservationZoneLabel } from "../smart";
import MemberProfile from "./MemberProfile";

export default function AccountOverview() {
  const { state, customer } = useDemo();
  const [view, setView] = useState<"overview" | "profile">("overview");
  const reservations = useMemo(
    () => customerReservations(state, customer.id),
    [customer.id, state],
  );
  const accent = tierAccent(customer.tier);
  const upcoming = useMemo(
    () =>
      reservations.filter(
        (r) => ["pending", "confirmed", "checked_in", "seated", "waitlisted"].includes(r.status),
      ),
    [reservations],
  );
  const recentNotes = useMemo(
    () => state.notifications.filter(
      (n) => n.audience === "customer" && n.customerId === customer.id,
    ).slice(0, 4),
    [customer.id, state],
  );
  const lifetimeCovers = useMemo(
    () => reservations.filter((r) => r.status === "completed").reduce((s, r) => s + r.partySize, 0),
    [reservations],
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-9 sm:px-6 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-tap">My profile</p>
          <h1 className="mt-1 font-display text-[26px] font-semibold tracking-[-0.02em]">{customer.name}</h1>
          <p className="mt-1 text-[12px] text-ink-muted">Personalized account and preferences.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brass/30 bg-brass-soft px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-brass-dark">
            <Star className="h-2.5 w-2.5 fill-brass" aria-hidden="true" />
            {customer.tier}
          </span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-1 border-b border-hairline">
        {(["overview", "profile"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={cn(
              "rounded-lg px-3.5 py-2 text-[11.5px] font-medium transition",
              view === id ? "bg-porcelain text-ink" : "text-ink-muted hover:bg-tap-soft/50 hover:text-ink",
            )}
          >
            {id === "overview" ? "Overview" : "Profile"}
          </button>
        ))}
      </div>

      {view === "overview" ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-hairline bg-surface p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${accent}14`, color: accent }}>
                <Ticket className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-muted">Completed visits</p>
            </div>
            <p className="mt-2 font-display text-[22px] font-semibold">
              {reservations.filter((r) => r.status === "completed").length}
            </p>
            <p className="text-[10.5px] text-ink-muted">{lifetimeCovers} total covers</p>
          </div>
          <div className="rounded-2xl border border-hairline bg-surface p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${accent}14`, color: accent }}>
                <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-muted">Messages</p>
            </div>
            <p className="mt-2 font-display text-[22px] font-semibold">
              {recentNotes.filter((n) => n.kind === "message").length}
            </p>
            <p className="text-[10.5px] text-ink-muted">Latest from the floor</p>
          </div>
          <div className="rounded-2xl border border-hairline bg-surface p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${accent}14`, color: accent }}>
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-muted">Upcoming</p>
            </div>
            <p className="mt-2 font-display text-[22px] font-semibold">{upcoming.length}</p>
            <p className="text-[10.5px] text-ink-muted">
              {upcoming.some((r) => r.status === "waitlisted") ? "A waitlist is active" : "Confirmed or pending"}
            </p>
          </div>
          <div className="rounded-2xl border border-hairline bg-surface p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${accent}14`, color: accent }}>
                <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-muted">Quick links</p>
            </div>
            <div className="mt-2 space-y-1.5 text-[10.5px]">
              <a href="/demo/omnitaps?tab=reservations" className="block rounded-lg border border-hairline px-2 py-1.5 text-ink-muted hover:border-tap/40 hover:text-ink">
                My reservations
              </a>
              <a href="/demo/omnitaps?tab=updates" className="block rounded-lg border border-hairline px-2 py-1.5 text-ink-muted hover:border-tap/40 hover:text-ink">
                Updates
              </a>
              <a href="/demo/omnitaps?tab=discover" className="block rounded-lg border border-hairline px-2 py-1.5 text-ink-muted hover:border-tap/40 hover:text-ink">
                Discover
              </a>
            </div>
          </div>
        </div>
      ) : null}

      {view === "overview" ? (
        <div className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-2xl border border-hairline bg-surface p-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-tap">Upcoming bookings</p>
            <h2 className="mt-0.5 font-display text-[19px] font-semibold">What's on your books</h2>
            {upcoming.length === 0 ? (
              <p className="mt-3 text-[11px] text-ink-muted">No upcoming bookings right now.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {upcoming.slice(0, 4).map((reservation) => (
                  <div
                    key={reservation.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-hairline bg-porcelain/40 px-3 py-2.5"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tap-soft text-tap font-mono text-[9px] font-semibold">
                        {reservation.guestName.split(" ").map((part) => part[0]).slice(0, 2).join("")}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11.5px] font-semibold">
                          {reservation.guestName}
                          {reservation.vip ? <Star className="ml-1 h-3 w-3 fill-brass text-brass" aria-hidden="true" /> : null}
                        </p>
                        <p className="text-[10px] text-ink-muted">
                          {tableLabelForIds(reservation.tableIds, state.tables)} · {reservationZoneLabel(reservation)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10.5px] text-ink-muted">
                      <CalendarDays className="h-3 w-3" aria-hidden="true" />
                      {formatDateLong(reservation.startTime)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-tap-soft/50 px-2.5 py-1.5 text-[10px] text-tap-dark">
              <Ticket className="h-3 w-3" aria-hidden="true" />
              Show the same bookings as the reservation queue.
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-hairline bg-surface p-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-tap">Contact</p>
              <h2 className="mt-0.5 font-display text-[19px] font-semibold">How to reach you</h2>
              <div className="mt-3 space-y-2 text-[10.5px]">
                <p className="flex items-center gap-2">
                  <Mail className="h-3 w-3 text-ink-faint" aria-hidden="true" />
                  <span className="truncate">{customer.email}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="h-3 w-3 text-ink-faint" aria-hidden="true" />
                  <span className="tabular-nums">{customer.phone}</span>
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-hairline bg-surface p-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-tap">Recent activity</p>
              <h2 className="mt-0.5 font-display text-[19px] font-semibold">From the floor</h2>
              {recentNotes.length === 0 ? (
                <p className="mt-2 text-[11px] text-ink-muted">Nothing new yet.</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {recentNotes.map((note) => (
                    <div
                      key={note.id}
                      className={cn(
                        "rounded-xl border px-3 py-2.5",
                        note.read
                          ? "border-hairline bg-porcelain/40"
                          : "border-tap/25 bg-tap-soft/30",
                      )}
                    >
                      <p className="flex items-center justify-between gap-2 text-[10.5px] font-semibold">
                        {note.title}
                        <span className="font-mono text-[8px] text-ink-faint">{formatTime(note.createdAt)}</span>
                      </p>
                      <p className="mt-0.5 text-[10px] text-ink-muted">{note.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>
      ) : null}

      {view === "profile" ? <MemberProfile reservations={reservations} /> : null}
    </div>
  );
}

function tierAccent(tier: string): string {
  return tier === "Gold" ? "#c4a35a" : tier === "Brass" ? "#b8873b" : "#8a8175";
}
