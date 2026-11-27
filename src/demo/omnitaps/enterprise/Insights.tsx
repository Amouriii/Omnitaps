import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Check,
  MessageCircle,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  buildSmartInsights,
  getWaitlistMatches,
} from "../smart";
import {
  bookingHeatmap,
  finalisedWindowStats,
  serviceMix,
  upcomingReservations,
  zoneUtilization,
} from "../metrics";
import {
  formatDate,
  formatRelative,
  formatTime,
  formatTimeLabel,
  localDateKey,
} from "../time";
import { enterpriseNotifications, useDemo } from "../store";
import type { SmartInsight } from "../types";
import { SectionHeading, cn } from "../ui";
import type { OpsView } from "./EnterprisePov";

const SEVERITY_STYLES: Record<
  SmartInsight["severity"],
  { border: string; bg: string; text: string; dot: string }
> = {
  critical: { border: "border-[#f3c9c9]", bg: "bg-[#fdecec]", text: "text-[#a33a3a]", dot: "bg-[#a33a3a]" },
  warning: { border: "border-brass/35", bg: "bg-brass-soft/50", text: "text-brass-dark", dot: "bg-brass" },
  success: { border: "border-emerald-200", bg: "bg-emerald-50", text: "text-emerald-800", dot: "bg-emerald-500" },
  info: { border: "border-tap/25", bg: "bg-tap-soft/40", text: "text-tap-dark", dot: "bg-tap" },
};

export default function Insights({
  onOpenReservation,
  onNavigate,
}: {
  onOpenReservation: (reservationId: string) => void;
  onNavigate: (view: OpsView) => void;
}) {
  const { state, opsPersona, actions } = useDemo();
  const todayKey = localDateKey(state.demoNow);
  const insights = useMemo(() => buildSmartInsights(state), [state]);
  const matches = useMemo(() => getWaitlistMatches(state), [state]);
  const matchByEntry = useMemo(
    () => new Map(matches.map((match) => [match.entry.id, match])),
    [matches],
  );
  const waiting = state.waitlist
    .filter((entry) => entry.status === "waiting")
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
  const heatmap = useMemo(() => bookingHeatmap(state, 7), [state]);
  const mix = useMemo(() => serviceMix(state, 14), [state]);
  const zones = useMemo(() => zoneUtilization(state), [state]);
  const vipArrivals = useMemo(
    () => upcomingReservations(state, 6).filter((reservation) => reservation.vip),
    [state],
  );
  const stats = useMemo(() => finalisedWindowStats(state), [state]);
  const messages = useMemo(
    () => enterpriseNotifications(state).filter((notification) => notification.kind === "message"),
    [state],
  );
  const dayKeys = useMemo(
    () => Array.from(new Set(heatmap.cells.map((cell) => cell.dayKey))),
    [heatmap.cells],
  );

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

  const handleAutoFill = () => {
    const result = actions.autoFillWaitlist(opsPersona.name);
    if (result.promoted.length === 0) {
      toast.info("No waitlist matches right now", {
        description: "Nothing fits the current table plan. The engine retries on every cancellation.",
      });
      return;
    }
    toast.success(
      `${result.promoted.length} waitlist ${result.promoted.length === 1 ? "guest" : "guests"} confirmed`,
      { description: result.promoted.map((reservation) => reservation.guestName).join(", ") },
    );
  };

  const handlePromote = (entryId: string) => {
    try {
      const result = actions.promoteWaitlistEntry(entryId, opsPersona.name);
      toast.success("Waitlist guest confirmed", {
        description: `${result.reservation.guestName} · ${result.reservation.reference}.`,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That match is no longer available.");
    }
  };

  const handleReminders = () => {
    const targets = upcomingReservations(state, 6).filter((reservation) =>
      ["confirmed", "pending"].includes(reservation.status),
    );
    if (targets.length === 0) {
      toast.info("No arrivals to remind in the next six hours.");
      return;
    }
    let sent = 0;
    for (const reservation of targets.slice(0, 3)) {
      try {
        actions.sendReminder(reservation.id, opsPersona.name);
        sent += 1;
      } catch {
        // A booking may have moved status between the read and the write.
      }
    }
    if (sent === 0) {
      toast.error("No reminders could be sent", {
        description: "The arrivals moved status. Refresh the queue and try again.",
      });
      return;
    }
    toast.success(`${sent} reminder${sent === 1 ? "" : "s"} sent`, {
      description: "Guests see it immediately in their Updates tab.",
    });
  };

  return (
    <div className="space-y-4">
      <SectionHeading
        eyebrow="Smart insights"
        title="What the floor should know"
        description="The waitlist, VIP arrivals, peak-hour pressure and guest messages — ranked, with the next action attached."
        actions={
          <button
            type="button"
            onClick={handleAutoFill}
            className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-3.5 py-2 text-[11.5px] font-medium text-white transition hover:bg-ink/90"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Auto-fill waitlist
          </button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr] xl:items-start">
        <div className="space-y-4">
          <div className="rounded-2xl border border-hairline bg-surface">
            <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-tap">Alerts</p>
                <h2 className="mt-0.5 font-display text-[19px] font-semibold">Action queue</h2>
              </div>
              <span className="rounded-full bg-ink px-2 py-1 font-mono text-[8px] font-semibold text-white">
                {insights.length}
              </span>
            </div>
            {insights.length === 0 ? (
              <div className="p-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-[12px] font-semibold text-emerald-800">Everything is balanced</p>
                  <p className="mt-1 text-[10.5px] leading-[1.6] text-emerald-700">
                    No VIP conflicts, overbooking risks, or waitlist matches need a decision right now.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 p-3">
                {insights.map((insight) => {
                  const style = SEVERITY_STYLES[insight.severity];
                  return (
                    <div key={insight.id} className={cn("rounded-xl border p-3.5", style.border, style.bg)}>
                      <div className="flex items-start gap-2.5">
                        <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", style.dot)} aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-[12px] font-semibold leading-snug", style.text)}>
                            {insight.title}
                          </p>
                          <p className="mt-1 text-[10.5px] leading-[1.6] text-ink-muted">{insight.body}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleInsight(insight)}
                          className="shrink-0 rounded-lg bg-surface px-2.5 py-1.5 text-[9.5px] font-semibold text-ink shadow-sm transition hover:bg-porcelain"
                        >
                          {insight.actionLabel}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-hairline bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-4 py-3">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-tap">Waitlist engine</p>
                <h2 className="mt-0.5 font-display text-[19px] font-semibold">
                  {waiting.length} waiting · {matches.length} matched
                </h2>
              </div>
              <button
                type="button"
                onClick={handleAutoFill}
                className="inline-flex items-center gap-1 rounded-lg border border-hairline px-2.5 py-1.5 text-[9.5px] font-semibold text-ink-muted transition hover:border-hairline-strong hover:text-ink"
              >
                Fill all matches
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
            {waiting.length === 0 ? (
              <p className="px-4 py-8 text-center text-[11.5px] text-ink-muted">
                The waitlist is empty. New guest requests appear here instantly.
              </p>
            ) : (
              <div className="divide-y divide-hairline">
                {waiting.map((entry, index) => {
                  const match = matchByEntry.get(entry.id);
                  const service = state.services.find((item) => item.id === entry.serviceId);
                  return (
                    <div key={entry.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-porcelain font-mono text-[9px] font-semibold text-ink-muted">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-[11.5px] font-semibold">
                          {entry.guestName}
                          {entry.vip ? <Star className="h-3 w-3 fill-brass text-brass" aria-label="VIP" /> : null}
                        </p>
                        <p className="text-[10px] text-ink-muted">
                          {service?.name} · party {entry.partySize} ·{" "}
                          {entry.desiredDate === todayKey
                            ? "today"
                            : formatDate(entry.desiredDate, true)}{" "}
                          {formatTimeLabel(entry.desiredFrom)} · joined{" "}
                          {formatRelative(entry.joinedAt, state.demoNow)}
                        </p>
                        <p className="mt-0.5 text-[9.5px] text-ink-faint">
                          {match
                            ? `Match: ${match.allocation.reason}`
                            : "No table fits this window yet — still scanning."}
                        </p>
                      </div>
                      {match ? (
                        <button
                          type="button"
                          onClick={() => handlePromote(entry.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-tap px-2.5 py-1.5 text-[9.5px] font-semibold text-white transition hover:bg-tap-dark"
                        >
                          <Check className="h-2.5 w-2.5" aria-hidden="true" />
                          Confirm match
                        </button>
                      ) : (
                        <span className="rounded-full bg-porcelain px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-ink-faint">
                          No match
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-hairline bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-tap">Demand heatmap</p>
                <h2 className="mt-0.5 font-display text-[19px] font-semibold">Peak hours, by day</h2>
                <p className="mt-0.5 text-[10.5px] text-ink-muted">Last 7 days · bookings per hour</p>
              </div>
              <span className="rounded-full bg-tap-soft px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-tap">
                {heatmap.max} max
              </span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <div
                className="grid min-w-[520px] gap-1"
                style={{ gridTemplateColumns: "56px repeat(12, minmax(0, 1fr))" }}
              >
                <div />
                {heatmap.hours.map((hour) => (
                  <div key={`header-${hour}`} className="text-center font-mono text-[8px] text-ink-faint">
                    {hour % 2 === 0 ? hour : ""}
                  </div>
                ))}
                {dayKeys.map((dayKey) => (
                  <div key={dayKey} className="contents">
                    <div className="pr-1 text-right font-mono text-[8.5px] text-ink-muted">
                      {formatDate(dayKey, true)}
                    </div>
                    {heatmap.hours.map((hour) => {
                      const cell = heatmap.cells.find(
                        (entry) => entry.dayKey === dayKey && entry.hour === hour,
                      );
                      const count = cell?.count ?? 0;
                      const intensity = count / heatmap.max;
                      return (
                        <div
                          key={`${dayKey}-${hour}`}
                          className="ot-heat-cell flex h-6 items-center justify-center rounded-[3px] font-mono text-[8px]"
                          style={{
                            backgroundColor:
                              count === 0
                                ? "var(--color-porcelain)"
                                : `rgba(21, 94, 239, ${0.1 + intensity * 0.8})`,
                            color: intensity > 0.42 ? "#ffffff" : "var(--color-ink-muted)",
                          }}
                          title={`${cell?.dayLabel ?? dayKey} · ${hour}:00 · ${count} bookings`}
                        >
                          {count > 0 ? count : ""}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.1em] text-ink-faint">
              <span>Low</span>
              <span className="h-2 w-4 rounded-sm bg-tap/10" />
              <span className="h-2 w-4 rounded-sm bg-tap/35" />
              <span className="h-2 w-4 rounded-sm bg-tap/60" />
              <span className="h-2 w-4 rounded-sm bg-tap/90" />
              <span>High</span>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-hairline bg-surface p-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-tap">Service mix</p>
            <h2 className="mt-0.5 font-display text-[19px] font-semibold">What guests choose</h2>
            <p className="mt-0.5 text-[10.5px] text-ink-muted">Last 14 days · overbooked demand</p>
            <div className="mt-3 space-y-2.5">
              {mix.map((service) => (
                <div key={service.serviceId}>
                  <div className="flex items-center justify-between gap-2 text-[10.5px]">
                    <span className="truncate">{service.name}</span>
                    <span className="font-mono text-[9px] text-ink-muted">{service.count}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-porcelain">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(service.share * 100, service.count > 0 ? 4 : 0)}%`,
                        backgroundColor: service.accent,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-hairline bg-surface p-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-tap">Capacity</p>
            <h2 className="mt-0.5 font-display text-[19px] font-semibold">Live zone utilization</h2>
            <div className="mt-3 space-y-2.5">
              {zones.map((zone) => (
                <div key={zone.zone}>
                  <div className="flex items-center justify-between gap-2 text-[10.5px]">
                    <span>{zone.label}</span>
                    <span className="font-mono text-[9px] text-ink-muted">
                      {zone.held}/{zone.tables}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-porcelain">
                    <div
                      className="h-full rounded-full bg-tap"
                      style={{ width: `${Math.round(zone.utilization * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onNavigate("floor")}
              className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-tap"
            >
              Open floor <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>

          <div className="rounded-2xl border border-brass/25 bg-brass-soft/40 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-brass-dark">
                  No-show guard
                </p>
                <h2 className="mt-0.5 font-display text-[19px] font-semibold text-ink">
                  Protect the covers
                </h2>
              </div>
              <AlertTriangle className="h-4 w-4 text-brass-dark" aria-hidden="true" />
            </div>
            <p className="mt-2 text-[10.5px] leading-[1.6] text-brass-dark">
              Last 14 days: {stats.completed} completed · {stats.noShows} no-shows ·{" "}
              {stats.cancellations} cancellations.
            </p>
            <button
              type="button"
              onClick={handleReminders}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-[10px] font-semibold text-white transition hover:bg-ink/90"
            >
              <Bell className="h-3 w-3" aria-hidden="true" />
              Send arrival reminders
            </button>
          </div>

          <div className="rounded-2xl border border-hairline bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-tap">Guest messages</p>
                <h2 className="mt-0.5 font-display text-[19px] font-semibold">Concierge inbox</h2>
              </div>
              <MessageCircle className="h-4 w-4 text-ink-faint" aria-hidden="true" />
            </div>
            {messages.length === 0 ? (
              <p className="mt-3 text-[10.5px] leading-[1.6] text-ink-muted">
                No guest messages yet. Messages sent from the customer Updates tab land here.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {messages.slice(0, 4).map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "rounded-xl border px-3 py-2.5",
                      notification.read ? "border-hairline bg-porcelain/40" : "border-tap/25 bg-tap-soft/30",
                    )}
                  >
                    <p className="flex items-center justify-between gap-2 text-[10.5px] font-semibold">
                      {notification.title}
                      <span className="font-mono text-[8px] font-normal text-ink-faint">
                        {formatRelative(notification.createdAt, state.demoNow)}
                      </span>
                    </p>
                    <p className="mt-1 line-clamp-3 text-[10px] leading-[1.55] text-ink-muted">
                      {notification.body}
                    </p>
                    {!notification.read ? (
                      <button
                        type="button"
                        onClick={() => actions.markNotificationRead(notification.id)}
                        className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-semibold text-tap"
                      >
                        <Check className="h-2.5 w-2.5" aria-hidden="true" />
                        Mark read
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-hairline bg-surface p-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-tap">VIPs</p>
            <h2 className="mt-0.5 font-display text-[19px] font-semibold">Arriving next</h2>
            {vipArrivals.length === 0 ? (
              <p className="mt-3 text-[10.5px] leading-[1.6] text-ink-muted">
                No VIP arrivals in the next six hours.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {vipArrivals.slice(0, 3).map((reservation) => (
                  <button
                    key={reservation.id}
                    type="button"
                    onClick={() => onOpenReservation(reservation.id)}
                    className="flex w-full items-center gap-2 rounded-xl border border-hairline bg-porcelain/40 px-2.5 py-2 text-left transition hover:border-brass/40"
                  >
                    <Star className="h-3 w-3 shrink-0 fill-brass text-brass" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10.5px] font-semibold">{reservation.guestName}</p>
                      <p className="text-[9px] text-ink-muted">
                        {formatTime(reservation.startTime)} · party {reservation.partySize}
                      </p>
                    </div>
                    <ArrowRight className="h-3 w-3 text-ink-faint" aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
            <div className="mt-3 flex items-center gap-1.5 text-[9px] text-ink-faint">
              <Users className="h-3 w-3" aria-hidden="true" />
              VIP notes and allergies are on the booking.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
