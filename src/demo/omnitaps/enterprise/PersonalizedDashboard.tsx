import { useMemo } from "react";
import { Bell, CalendarDays, CheckCircle2, Clock, CreditCard, HelpCircle, PartyPopper, Phone, RefreshCw, Shield, Star, Ticket, TrendingUp, Users } from "lucide-react";
import { enterpriseNotifications, useDemo } from "../store";
import { computeMetrics, finalisedWindowStats, statusBreakdown } from "../metrics";
import { formatMoney, formatRelative } from "../time";
import { cn } from "../ui";

const METRIC_CARDS = [
  { key: "bookingsToday" as const, label: "Bookings today", note: "Confirmed, pending and arrivals", icon: CalendarDays, accent: "#155eef" },
  { key: "guestsToday" as const, label: "Covers today", note: "Guests across all statuses", icon: Users, accent: "#b8873b" },
  { key: "liveOccupancy" as const, label: "Live occupancy", note: "Held tables right now", icon: TrendingUp, accent: "#0f6b4f", format: (v: number) => `${Math.round(v * 100)}%` },
  { key: "waitlistCount" as const, label: "Waitlist", note: "Guests waiting for a table", icon: Clock, accent: "#8c6f2e" },
  { key: "noShowRate" as const, label: "No-show rate", note: "Last 14 days", icon: HelpCircle, accent: "#a33a3a", format: (v: number) => `${Math.round(v * 100)}%` },
  { key: "revenueTodayCents" as const, label: "Expected revenue", note: "Today's bookings", icon: CreditCard, accent: "#155eef", format: (v: number) => formatMoney(v, { compact: true }) },
];

const BREAKDOWN_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  checked_in: "Checked in",
  seated: "Seated",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
  waitlisted: "Waitlisted",
};

export default function PersonalizedDashboard() {
  const { state, opsPersona, customer } = useDemo();
  const metrics = useMemo(() => computeMetrics(state), [state]);
  const breakdown = useMemo(() => statusBreakdown(state), [state]);
  const stats = useMemo(() => finalisedWindowStats(state), [state]);
  const unread = useMemo(
    () => enterpriseNotifications(state).filter((n) => !n.read).length,
    [state],
  );
  const recentNotes = useMemo(
    () => enterpriseNotifications(state).slice(0, 4),
    [state],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink font-mono text-[11px] font-semibold text-white">
              {opsPersona.initials}
            </span>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-tap">
                {opsPersona.role}
              </p>
              <p className="font-display text-[18px] font-semibold">{opsPersona.name}</p>
            </div>
          </div>
          <div className="rounded-xl border border-hairline bg-surface px-3 py-2">
            <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-ink-faint">Signed in as</p>
            <p className="text-[11.5px] font-semibold">{opsPersona.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-emerald-800">
            <span className="ot-live-dot h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            Live
          </span>
          {unread > 0 ? (
            <span className="rounded-full bg-tap px-2 py-1 font-mono text-[9px] font-semibold text-white">
              {unread} notification{unread === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {METRIC_CARDS.map((card) => {
          const raw = metrics[card.key];
          const value = card.format ? card.format(raw) : String(raw);
          return (
            <div key={card.key} className="rounded-2xl border border-hairline bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-ink-muted">
                  {card.label}
                </p>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${card.accent}14`, color: card.accent }}>
                  <card.icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-2 font-display text-[24px] font-semibold">{value}</p>
              <p className="mt-1 text-[10.5px] text-ink-muted">{card.note}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_0.7fr]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-hairline bg-surface p-4">
            <div className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-3">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-tap">Today's flow</p>
                <h2 className="mt-0.5 font-display text-[19px] font-semibold">Status breakdown</h2>
              </div>
              <span className="rounded-full bg-tap-soft px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-tap">
                {breakdown.reduce((s, b) => s + b.count, 0)} total
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {breakdown.map((item) => {
                const label = BREAKDOWN_LABELS[item.status] ?? item.status;
                const accent = statusAccent(item.status);
                return (
                  <div key={item.status} className="flex items-center justify-between gap-2 rounded-xl border border-hairline bg-porcelain/40 px-3 py-2">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} aria-hidden="true" />
                      <span className="text-[11.5px] font-medium">{label}</span>
                    </span
                    >
                    <span className="font-mono text-[11px] tabular-nums text-ink-muted">{item.count}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-hairline bg-surface p-4">
            <div className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-3">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-tap">Recent activity</p>
                <h2 className="mt-0.5 font-display text-[19px] font-semibold">Notes & alerts</h2>
              </div>
              <Ticket className="h-4 w-4 text-ink-faint" aria-hidden="true" />
            </div>
            {recentNotes.length === 0 ? (
              <p className="mt-3 text-center text-[11px] text-ink-muted">No recent notes.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {recentNotes.map((note) => (
                  <div key={note.id} className="rounded-xl border border-hairline bg-porcelain/40 px-3 py-2.5">
                    <p className="flex items-center gap-1.5 text-[10.5px] font-semibold">
                      {note.title}
                      {note.reservationId ? (
                        <a
                          href={`/demo/omnitaps/operations?open=${note.reservationId}`}
                          className="ml-auto text-[9px] text-tap hover:underline"
                        >
                          Open
                        </a>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-[10px] text-ink-muted">{note.body}</p>
                    <p className="mt-1 font-mono text-[8.5px] uppercase tracking-[0.06em] text-ink-faint">
                      {formatRelative(note.createdAt, state.demoNow)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-brass/25 bg-brass-soft/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-brass-dark" aria-hidden="true" />
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-brass-dark">Your account</p>
                  <p className="text-[12px] font-semibold">{customer.name}</p>
                </div>
              </div>
              <Star className="h-3.5 w-3.5 text-brass fill-brass" aria-hidden="true" />
            </div>
            <div className="mt-3 space-y-1.5 text-[10.5px] text-ink-muted">
              <p className="flex items-center gap-2">
                <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-ink-faint">Tier</span>
                <span className="font-medium">{customer.tier}</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-ink-faint">Visits</span>
                <span className="tabular-nums">{customer.visits}</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-ink-faint">Member since</span>
                <span className="tabular-nums">{customer.memberSince}</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-ink-faint">VIP</span>
                <span className="tabular-nums">{customer.vip ? "Yes" : "No"}</span>
              </p>
            </div>
            {customer.notes ? (
              <p className="mt-2 rounded-lg bg-porcelain/60 px-2.5 py-2 text-[10px] text-ink-muted">
                {customer.notes}
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-hairline bg-surface p-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-tap">Performance</p>
            <h2 className="mt-0.5 font-display text-[19px] font-semibold">Results</h2>
            <div className="mt-3 space-y-2 text-[10.5px]">
              <p className="flex items-center justify-between gap-2 border-b border-hairline py-1.5">
                <span className="text-ink-muted">Completed</span>
                <span className="font-mono tabular-nums text-ink">{stats.completed}</span>
              </p>
              <p className="flex items-center justify-between gap-2 border-b border-hairline py-1.5">
                <span className="flex items-center gap-1.5 text-ink-muted">
                  <Phone className="h-3 w-3 text-brass-dark" aria-hidden="true" />
                  No-shows
                </span>
                <span className="font-mono tabular-nums text-[#a33a3a]">{stats.noShows}</span>
              </p>
              <p className="flex items-center justify-between gap-2 py-1.5">
                <span className="flex items-center gap-1.5 text-ink-muted">
                  <RefreshCw className="h-3 w-3 text-ink-faint" aria-hidden="true" />
                  Cancellations
                </span>
                <span className="font-mono tabular-nums text-ink">{stats.cancellations}</span>
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] text-emerald-800">
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              Service running normally
            </div>
          </section>

          <section className="rounded-2xl border border-hairline bg-surface p-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-tap">Discovery</p>
            <h2 className="mt-0.5 font-display text-[19px] font-semibold">Find a table</h2>
            <p className="mt-1 text-[10.5px] text-ink-muted">See what's open and book directly from the customer portal.</p>
            <a
              href="/demo/omnitaps"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-tap px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-tap-dark"
            >
              <Ticket className="h-3.5 w-3.5" aria-hidden="true" />
              Open customer view
            </a>
          </section>

          <section className="rounded-2xl border border-hairline bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-tap">Support</p>
                <h2 className="mt-0.5 font-display text-[19px] font-semibold">Needs help</h2>
              </div>
              <HelpCircle className="h-4 w-4 text-ink-faint" aria-hidden="true" />
            </div>
            <p className="mt-2 text-[10.5px] text-ink-muted">Quick links to the most-used operations.</p>
            <div className="mt-3 space-y-1.5">
              {[
                { label: "Reservation queue", href: "/demo/omnitaps/operations" },
                { label: "Calendar", href: "/demo/omnitaps/operations" },
                { label: "Floor plan", href: "/demo/omnitaps/operations" },
                { label: "Smart insights", href: "/demo/omnitaps/operations" },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="flex items-center justify-between rounded-lg border border-hairline bg-porcelain/40 px-2.5 py-2 text-[10.5px] text-ink-muted transition hover:border-hairline-strong hover:text-ink"
                >
                  {item.label}
                  <Ticket className="h-3 w-3" aria-hidden="true" />
                </a>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function statusAccent(status: string): string {
  return (
    {
      pending: "#b8873b",
      confirmed: "#1966c2",
      checked_in: "#0f6b4f",
      seated: "#2e6b3a",
      completed: "#8a8175",
      cancelled: "#b0a89c",
      no_show: "#a33a3a",
      waitlisted: "#b8873b",
    }[status] ?? "#8a8175"
  );
}
