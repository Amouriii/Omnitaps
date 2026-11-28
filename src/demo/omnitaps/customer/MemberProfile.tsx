import { useMemo } from "react";
import { Bell, CalendarDays, Gift, Mail, MessageCircle, Phone, Star, Ticket } from "lucide-react";
import { customerNotifications, useDemo } from "../store";
import { formatRelative } from "../time";
import { cn } from "../ui";
import type { Reservation } from "../types";
import { tableLabelForIds, reservationZoneLabel } from "../smart";

const TIER_ACCENT: Record<string, string> = {
  Guest: "#8a8175",
  Brass: "#b8873b",
  Gold: "#c4a35a",
};

export default function MemberProfile({ reservations }: { reservations: Reservation[] }) {
  const { state, customer } = useDemo();
  const accent = TIER_ACCENT[customer.tier] ?? "#8a8175";
  const unread = useMemo(
    () => customerNotifications(state, customer.id).filter((n) => !n.read).length,
    [customer.id, state],
  );
  const upcoming = useMemo(
    () => reservations.filter(
      (r) => ["pending", "confirmed", "checked_in", "seated", "waitlisted"].includes(r.status),
    ),
    [reservations],
  );
  const recentNotes = useMemo(
    () => customerNotifications(state, customer.id).slice(0, 4),
    [customer.id, state],
  );
  const lifetimeCovers = useMemo(
    () => reservations.filter((r) => r.status === "completed").reduce((s, r) => s + r.partySize, 0),
    [reservations],
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-tap">Your profile</p>
          <h1 className="mt-1 font-display text-[22px] font-semibold">{customer.name}</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brass/30 bg-brass-soft px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-brass-dark">
            <Star className="h-2.5 w-2.5 fill-brass" aria-hidden="true" />
            {customer.tier}
          </span>
          {unread > 0 ? (
            <span className="rounded-full bg-tap px-2 py-1 font-mono text-[9px] font-semibold text-white">
              {unread} update{unread === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-hairline bg-surface p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${accent}14`, color: accent }}>
              <Gift className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-muted">Tier</p>
          </div>
          <p className="mt-2 font-display text-[20px] font-semibold">{customer.tier}</p>
          <p className="text-[10.5px] text-ink-muted">{customer.visits} visits · since {customer.memberSince}</p>
        </div>
        <div className="rounded-2xl border border-hairline bg-surface p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${accent}14`, color: accent }}>
              <Ticket className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-muted">Completed visits</p>
          </div>
          <p className="mt-2 font-display text-[20px] font-semibold">{reservations.filter((r) => r.status === "completed").length}</p>
          <p className="text-[10.5px] text-ink-muted">{lifetimeCovers} total covers</p>
        </div>
        <div className="rounded-2xl border border-hairline bg-surface p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${accent}14`, color: accent }}>
              <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-muted">Messages</p>
          </div>
          <p className="mt-2 font-display text-[20px] font-semibold">{recentNotes.filter((n) => n.kind === "message").length}</p>
          <p className="text-[10.5px] text-ink-muted">Latest from the floor</p>
        </div>
        <div className="rounded-2xl border border-hairline bg-surface p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${accent}14`, color: accent }}>
              <Bell className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-muted">Next booking</p>
          </div>
          <p className="mt-2 font-display text-[20px] font-semibold">{upcoming.length}</p>
          <p className="text-[10.5px] text-ink-muted">{upcoming.some((r) => r.status === "waitlisted") ? "A waitlist is active" : "Confirmed or pending"}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl border border-hairline bg-surface p-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-tap">Upcoming</p>
          <h2 className="mt-0.5 font-display text-[19px] font-semibold">Bookings</h2>
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
                    {formatRelative(reservation.startTime, state.demoNow)}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-tap-soft/50 px-2.5 py-1.5 text-[10px] text-tap-dark">
            <Ticket className="h-3 w-3" aria-hidden="true" />
            Shows the same bookings as the reservation queue.
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
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-tap">Notes</p>
            <h2 className="mt-0.5 font-display text-[19px] font-semibold">On your file</h2>
            {customer.notes ? (
              <p className="mt-2 text-[11px] text-ink-muted">{customer.notes}</p>
            ) : (
              <p className="mt-2 text-[11px] text-ink-muted">No special notes recorded.</p>
            )}
          </section>

          <section className="rounded-2xl border border-hairline bg-surface p-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-tap">Updates</p>
            <h2 className="mt-0.5 font-display text-[19px] font-semibold">Recent activity</h2>
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
                      <span className="font-mono text-[8px] text-ink-faint">{formatRelative(note.createdAt, state.demoNow)}</span>
                    </p>
                    <p className="mt-0.5 text-[10px] text-ink-muted">{note.body}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>

      <div className="mt-7 rounded-2xl border border-hairline bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-tap">About this profile</p>
            <h2 className="mt-0.5 font-display text-[19px] font-semibold">Your account</h2>
          </div>
          <Ticket className="h-4 w-4 text-ink-faint" aria-hidden="true" />
        </div>
        <p className="mt-2 text-[11px] leading-[1.6] text-ink-muted">
          This is your demo member profile. It shows the same reservation history, contact details, and notes that the floor sees when you book.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-brass-soft px-2.5 py-2 text-[10px] text-brass-dark">
          <span className="font-mono text-[8px] uppercase tracking-[0.1em]">Tier badge</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-brass-soft px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-brass-dark">
            <Star className="h-2 w-2 fill-brass" aria-hidden="true" />
            {customer.tier}
          </span>
          <span className="font-mono text-[8px] uppercase tracking-[0.1em]">VIP</span>
          <span className="tabular-nums">{customer.vip ? "Yes" : "No"}</span>
        </div>
      </div>
    </div>
  );
}
