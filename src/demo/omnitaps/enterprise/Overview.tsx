import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  Check,
  Clock,
  DollarSign,
  Gauge,
  Hourglass,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { buildSmartInsights, getWaitlistMatches } from "../smart";
import {
  bookingTrend,
  computeMetrics,
  peakHours,
  serviceMix,
  upcomingReservations,
  zoneUtilization,
} from "../metrics";
import { formatMoney, formatRelative, formatTime, formatTimeLabel } from "../time";
import { useDemo } from "../store";
import type { Reservation, SmartInsight } from "../types";
import { SectionHeading, StatusPill, cn } from "../ui";
import { PeakHoursChart, TrendChart, type TrendMetric } from "./charts";
import type { OpsView } from "./EnterprisePov";

const INSIGHT_STYLES: Record<
  SmartInsight["severity"],
  { border: string; bg: string; text: string; dot: string }
> = {
  critical: { border: "border-[#f3c9c9]", bg: "bg-[#fdecec]", text: "text-[#a33a3a]", dot: "bg-[#a33a3a]" },
  warning: { border: "border-brass/35", bg: "bg-brass-soft/50", text: "text-brass-dark", dot: "bg-brass" },
  success: { border: "border-emerald-200", bg: "bg-emerald-50", text: "text-emerald-800", dot: "bg-emerald-500" },
  info: { border: "border-tap/25", bg: "bg-tap-soft/40", text: "text-tap-dark", dot: "bg-tap" },
};

function KpiCard({
  label,
  value,
  note,
  icon: Icon,
  accent,
  children,
}: {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  accent: string;
  children?: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-hairline bg-surface p-3.5 shadow-[0_12px_30px_-32px_rgba(18,21,26,0.4)]">
      <div className="flex items-start justify-between gap-2">
        <p className="font-mono text-[8.5px] font-medium uppercase tracking-[0.14em] text-ink-muted">
          {label}
        </p>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${accent}14`, color: accent }}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 font-display text-[25px] font-semibold leading-none tracking-[-0.02em]">
        {value}
      </p>
      <p className="mt-1.5 text-[10px] leading-[1.5] text-ink-muted">{note}</p>
      {children}
    </article>
  );
}

export default function Overview({
  onOpenReservation,
  onNavigate,
}: {
  onOpenReservation: (reservationId: string) => void;
  onNavigate: (view: OpsView) => void;
}) {
  const { state, opsPersona, actions } = useDemo();
  const metrics = useMemo(() => computeMetrics(state), [state]);
  const trend = useMemo(() => bookingTrend(state, 14), [state]);
  const peak = useMemo(() => peakHours(state, 7), [state]);
  const smartInsights = useMemo(
    () => buildSmartInsights(state),
    [state],
  );
  const arrivals = useMemo(() => upcomingReservations(state, 4), [state]);
  const matches = useMemo(() => getWaitlistMatches(state), [state]);
  const zones = useMemo(() => zoneUtilization(state), [state]);
  const mix = useMemo(() => serviceMix(state, 7), [state]);
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("bookings");

  const handleStatus = (reservation: Reservation, status: Reservation["status"]) => {
    try {
      const result = actions.setReservationStatus(reservation.id, status, opsPersona.name);
      toast.success(`${reservation.guestName} · ${status.replace("_", " ")}`, {
        description:
          result.promoted.length > 0
            ? `${result.promoted.length} waitlist ${result.promoted.length === 1 ? "guest was" : "guests were"} auto-confirmed into the released table.`
            : `Reference ${reservation.reference}.`,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the booking.");
    }
  };

  const handleInsight = (insight: SmartInsight) => {
    if (insight.action === "promote_waitlist" && insight.waitlistId) {
      try {
        const result = actions.promoteWaitlistEntry(insight.waitlistId, opsPersona.name);
        toast.success("Waitlist guest confirmed", {
          description: `${result.reservation.guestName} · ${result.reservation.reference}.`,
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "That match is no longer available.");
      }
      return;
    }
    if (insight.action === "open_reservation" && insight.reservationId) {
      onOpenReservation(insight.reservationId);
      return;
    }
    if (insight.action === "view_calendar") onNavigate("calendar");
    if (insight.action === "view_queue") onNavigate("queue");
    if (insight.action === "view_floor") onNavigate("floor");
    if (insight.action === "view_waitlist") onNavigate("insights");
  };

  const focusInsight = smartInsights[0];
  const trendTotals = trend.reduce(
    (totals, point) => ({
      bookings: totals.bookings + point.bookings,
      guests: totals.guests + point.guests,
      revenue: totals.revenue + point.revenueCents,
    }),
    { bookings: 0, guests: 0, revenue: 0 },
  );
  const busiest = peak.reduce((best, point) => (point.covers > best.covers ? point : best), peak[0]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionHeading
          eyebrow="Today at a glance"
          title="The floor, in numbers"
          description="Live occupancy, arrivals, waitlist pressure and revenue — all from the same reservation state the customer portal writes to."
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigate("queue")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-surface px-3 py-2 text-[11.5px] font-medium text-ink-muted transition hover:border-hairline-strong hover:text-ink"
          >
            Open queue <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate("calendar")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-[11.5px] font-medium text-white transition hover:bg-ink/90"
          >
            Day timeline <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <KpiCard
          label="Bookings today"
          value={String(metrics.bookingsToday)}
          note={`${metrics.pendingToday} pending · ${metrics.upcomingTwoHours} arriving in 2h`}
          icon={CalendarCheck}
          accent="#155eef"
        />
        <KpiCard
          label="Covers today"
          value={String(metrics.guestsToday)}
          note={`Avg party ${metrics.avgPartySize.toFixed(1)} · ${metrics.activeCheckIns} checked in or seated`}
          icon={Users}
          accent="#b8873b"
        />
        <KpiCard
          label="Live occupancy"
          value={`${Math.round(metrics.liveOccupancy * 100)}%`}
          note={`${metrics.heldTables} of ${metrics.activeTables} tables held right now`}
          icon={Gauge}
          accent="#0f6b4f"
        >
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-porcelain">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all duration-500"
              style={{ width: `${Math.round(metrics.liveOccupancy * 100)}%` }}
            />
          </div>
        </KpiCard>
        <KpiCard
          label="Waitlist"
          value={String(metrics.waitlistCount)}
          note={
            metrics.waitlistMatches > 0
              ? `${metrics.waitlistMatches} ready to offer right now`
              : "No table matches yet"
          }
          icon={Hourglass}
          accent="#8c6f2e"
        />
        <KpiCard
          label="No-show rate"
          value={`${Math.round(metrics.noShowRate * 100)}%`}
          note={`Last 14 days · ${Math.round(metrics.cancellationRate * 100)}% cancellation`}
          icon={AlertTriangle}
          accent="#a33a3a"
        />
        <KpiCard
          label="Expected revenue"
          value={formatMoney(metrics.revenueTodayCents, { compact: true })}
          note={`${formatMoney(metrics.collectedTodayCents)} collected at the table`}
          icon={DollarSign}
          accent="#155eef"
        />
        <KpiCard
          label="Average party"
          value={metrics.avgPartySize.toFixed(1)}
          note="Guests per booking today"
          icon={TrendingUp}
          accent="#0f6b4f"
        />
        <KpiCard
          label="VIP arrivals"
          value={String(arrivals.filter((reservation) => reservation.vip).length)}
          note="Next four hours · flagged for the host"
          icon={Star}
          accent="#b8873b"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr] xl:items-start">
        <div className="space-y-5">
          <div className="rounded-2xl border border-hairline bg-surface p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-tap">Demand</p>
                <h2 className="mt-1 font-display text-[20px] font-semibold">Booking trend</h2>
                <p className="mt-0.5 text-[11px] text-ink-muted">
                  {trendTotals.bookings} bookings · {trendTotals.guests} covers ·{" "}
                  {formatMoney(trendTotals.revenue, { compact: true })} over 14 days
                </p>
              </div>
              <div className="inline-flex rounded-lg border border-hairline bg-porcelain/60 p-0.5">
                {(
                  [
                    { id: "bookings", label: "Bookings" },
                    { id: "guests", label: "Covers" },
                    { id: "revenue", label: "Revenue" },
                  ] as const
                ).map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setTrendMetric(entry.id)}
                    aria-pressed={trendMetric === entry.id}
                    className={cn(
                      "rounded-md px-2.5 py-1.5 text-[10px] font-semibold transition",
                      trendMetric === entry.id
                        ? "bg-surface text-ink shadow-sm"
                        : "text-ink-muted hover:text-ink",
                    )}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3">
              <TrendChart data={trend} metric={trendMetric} />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-hairline bg-surface p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-tap">Peak hours</p>
                  <h2 className="mt-1 font-display text-[20px] font-semibold">When the room fills</h2>
                  <p className="mt-0.5 text-[11px] text-ink-muted">
                    Last 7 days · covers by hour
                  </p>
                </div>
                <span className="rounded-full bg-tap-soft px-2 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-tap">
                  {busiest ? `Peak ${formatTimeLabel(`${String(busiest.hour).padStart(2, "0")}:00`)}` : "No data"}
                </span>
              </div>
              <div className="mt-4">
                <PeakHoursChart data={peak} />
              </div>
            </div>

            <div className="rounded-2xl border border-hairline bg-surface p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-tap">Zone load</p>
                  <h2 className="mt-1 font-display text-[20px] font-semibold">Where the tables are</h2>
                  <p className="mt-0.5 text-[11px] text-ink-muted">Live held tables by zone</p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate("floor")}
                  className="flex items-center gap-1 text-[10px] font-medium text-tap transition hover:text-tap-dark"
                >
                  Floor <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {zones.map((zone) => (
                  <div key={zone.zone}>
                    <div className="flex items-center justify-between gap-2 text-[10.5px]">
                      <span className="font-medium">{zone.label}</span>
                      <span className="font-mono text-[9px] tabular-nums text-ink-muted">
                        {zone.held}/{zone.tables}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-porcelain">
                      <div
                        className="h-full rounded-full bg-tap transition-all duration-500"
                        style={{ width: `${Math.round(zone.utilization * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 border-t border-hairline pt-3">
                <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-ink-faint">
                  Top service · last 7 days
                </p>
                <p className="mt-1 text-[11.5px] font-medium">{mix[0]?.name ?? "—"}</p>
                <p className="text-[10px] text-ink-muted">
                  {mix[0]?.count ?? 0} bookings · {mix[0]?.covers ?? 0} covers
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-hairline bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-4 py-3">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-tap">Next four hours</p>
                <h2 className="mt-0.5 font-display text-[19px] font-semibold">Arrivals</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("queue")}
                className="inline-flex items-center gap-1 text-[10.5px] font-medium text-tap transition hover:text-tap-dark"
              >
                Full queue <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
            {arrivals.length === 0 ? (
              <p className="px-4 py-8 text-center text-[12px] text-ink-muted">
                No more arrivals in the next four hours.
              </p>
            ) : (
              <div className="divide-y divide-hairline">
                {arrivals.map((reservation) => {
                  const nextStatus =
                    reservation.status === "pending"
                      ? ("confirmed" as const)
                      : ("checked_in" as const);
                  const actionLabel = reservation.status === "pending" ? "Confirm" : "Check in";
                  return (
                    <div key={reservation.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <span className="w-14 shrink-0 font-mono text-[10.5px] tabular-nums text-ink-muted">
                        {formatTime(reservation.startTime)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-1.5 text-[12px] font-semibold">
                          {reservation.guestName}
                          {reservation.vip ? (
                            <Star className="h-3 w-3 fill-brass text-brass" aria-label="VIP" />
                          ) : null}
                        </p>
                        <p className="text-[10.5px] text-ink-muted">
                          {state.services.find((service) => service.id === reservation.serviceId)?.name} ·{" "}
                          {reservation.partySize} guests · {reservation.reference}
                        </p>
                      </div>
                      <StatusPill status={reservation.status} />
                      <button
                        type="button"
                        onClick={() => handleStatus(reservation, nextStatus)}
                        className="inline-flex items-center gap-1 rounded-lg bg-tap px-2.5 py-1.5 text-[10.5px] font-semibold text-white transition hover:bg-tap-dark"
                      >
                        <Check className="h-3 w-3" aria-hidden="true" />
                        {actionLabel}
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenReservation(reservation.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-hairline px-2.5 py-1.5 text-[10.5px] font-medium text-ink-muted transition hover:text-ink"
                      >
                        Open
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-hairline bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-tap">Smart insights</p>
                <h2 className="mt-0.5 font-display text-[19px] font-semibold">Needs a look</h2>
              </div>
              <span className="rounded-full bg-ink px-2 py-1 font-mono text-[8px] font-semibold text-white">
                {smartInsights.length}
              </span>
            </div>

            {smartInsights.length === 0 ? (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-[12px] font-semibold text-emerald-800">Floor is balanced</p>
                <p className="mt-1 text-[10.5px] leading-[1.6] text-emerald-700">
                  No waitlist matches, VIP conflicts, or overbooking risks right now.
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {smartInsights.slice(0, 4).map((insight) => {
                  const style = INSIGHT_STYLES[insight.severity];
                  return (
                    <div
                      key={insight.id}
                      className={cn("rounded-xl border p-3", style.border, style.bg)}
                    >
                      <div className="flex items-start gap-2">
                        <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", style.dot)} aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-[11.5px] font-semibold leading-snug", style.text)}>
                            {insight.title}
                          </p>
                          <p className="mt-1 text-[10.5px] leading-[1.55] text-ink-muted">
                            {insight.body}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleInsight(insight)}
                            className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-ink transition hover:text-tap"
                          >
                            {insight.actionLabel}
                            <ArrowRight className="h-3 w-3" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <button
              type="button"
              onClick={() => onNavigate("insights")}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-hairline px-3 py-2 text-[10.5px] font-medium text-ink-muted transition hover:border-hairline-strong hover:text-ink"
            >
              Open smart insights
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>

          <div className="rounded-2xl border border-hairline bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-tap">Waitlist</p>
                <h2 className="mt-0.5 font-display text-[19px] font-semibold">Matches ready</h2>
              </div>
              <span className="rounded-full bg-brass-soft px-2 py-1 font-mono text-[8px] font-semibold text-brass-dark">
                {matches.length}
              </span>
            </div>
            {matches.length === 0 ? (
              <p className="mt-3 text-[11px] leading-[1.6] text-ink-muted">
                No guest fits a free table right now. The engine keeps scanning on every cancellation.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {matches.slice(0, 3).map((match) => (
                  <div key={match.entry.id} className="rounded-xl border border-hairline bg-porcelain/50 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11.5px] font-semibold">
                          {match.entry.guestName}
                          {match.entry.vip ? " · VIP" : ""}
                        </p>
                        <p className="mt-0.5 text-[10px] text-ink-muted">
                          Party {match.entry.partySize} · {formatTimeLabel(match.entry.desiredFrom)}
                        </p>
                        <p className="mt-0.5 truncate text-[9.5px] text-ink-faint">
                          {match.allocation.reason}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleInsight({
                          id: "",
                          severity: "success",
                          title: "",
                          body: "",
                          actionLabel: "Seat",
                          action: "promote_waitlist",
                          waitlistId: match.entry.id,
                        })}
                        className="shrink-0 rounded-lg bg-tap px-2 py-1 text-[9.5px] font-semibold text-white transition hover:bg-tap-dark"
                      >
                        Seat
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => onNavigate("insights")}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-hairline px-3 py-2 text-[10.5px] font-medium text-ink-muted transition hover:border-hairline-strong hover:text-ink"
            >
              Auto-fill waitlist
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>

          <div className="rounded-2xl border border-hairline bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-tap">Live activity</p>
                <h2 className="mt-0.5 font-display text-[19px] font-semibold">Floor log</h2>
              </div>
              <Clock className="h-4 w-4 text-ink-faint" aria-hidden="true" />
            </div>
            <div className="mt-3 space-y-3">
              {state.activity.slice(0, 6).map((entry) => (
                <div key={entry.id} className="flex gap-2.5">
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                      entry.actor === "staff"
                        ? "bg-tap-soft text-tap"
                        : entry.actor === "system"
                          ? "bg-brass-soft text-brass-dark"
                          : "bg-porcelain text-ink-muted",
                    )}
                  >
                    {entry.actor === "staff" ? (
                      <BadgeCheck className="h-3 w-3" aria-hidden="true" />
                    ) : entry.actor === "system" ? (
                      <Sparkles className="h-3 w-3" aria-hidden="true" />
                    ) : (
                      <Users className="h-3 w-3" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10.5px] leading-[1.55] text-ink">
                      <span className="font-semibold">{entry.actorName}</span> {entry.message}
                    </p>
                    <p className="mt-0.5 font-mono text-[8.5px] uppercase tracking-[0.06em] text-ink-faint">
                      {formatRelative(entry.at, state.demoNow)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {focusInsight ? (
        <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-surface px-4 py-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-tap-soft text-tap">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <p className="min-w-0 flex-1 text-[11px] text-ink-muted">
            <span className="font-semibold text-ink">{focusInsight.title}.</span>{" "}
            {focusInsight.body}
          </p>
          <button
            type="button"
            onClick={() => handleInsight(focusInsight)}
            className="inline-flex shrink-0 items-center gap-1 text-[10.5px] font-semibold text-tap"
          >
            {focusInsight.actionLabel}
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
