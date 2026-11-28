import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarCheck,
  CalendarDays,
  LayoutDashboard,
  LayoutGrid,
  Sparkles,
} from "lucide-react";
import { buildSmartInsights, getWaitlistMatches } from "../smart";
import { formatDateLong, formatTime, localDateKey } from "../time";
import { enterpriseNotifications, useDemo } from "../store";
import { cn } from "../ui";
import CalendarView from "./CalendarView";
import FloorView from "./FloorView";
import Insights from "./Insights";
import OpsReservationModal from "./OpsReservationModal";
import Overview from "./Overview";
import ReservationQueue from "./ReservationQueue";
import PersonalizedDashboard from "./PersonalizedDashboard";

export type OpsView = "overview" | "queue" | "calendar" | "floor" | "insights" | "dashboard";

const NAV: Array<{ id: OpsView; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "queue", label: "Reservations", icon: CalendarCheck },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "floor", label: "Floor", icon: LayoutGrid },
  { id: "insights", label: "Smart insights", icon: Sparkles },
  { id: "dashboard", label: "My account", icon: Bell },
];

export default function EnterprisePov() {
  const { state, opsPersona } = useDemo();
  const [view, setView] = useState<OpsView>("overview");
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);

  const insights = useMemo(() => buildSmartInsights(state), [state]);
  const waitlistMatches = useMemo(() => getWaitlistMatches(state).length, [state]);
  const queueCount = useMemo(
    () =>
      state.reservations.filter(
        (reservation) =>
          localDateKey(reservation.startTime) === localDateKey(state.demoNow) &&
          !["cancelled", "waitlisted"].includes(reservation.status),
      ).length,
    [state],
  );
  const unread = useMemo(
    () => enterpriseNotifications(state).filter((notification) => !notification.read).length,
    [state],
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [view]);

  const openReservation = (reservationId: string) => setSelectedReservationId(reservationId);
  const navigate = (next: OpsView) => setView(next);

  const counts: Record<OpsView, number | undefined> = {
    overview: undefined,
    queue: queueCount,
    calendar: undefined,
    floor: state.tables.filter((table) => table.status === "maintenance").length || undefined,
    insights: insights.length || undefined,
    dashboard: undefined,
  };

  return (
    <div className="min-h-screen bg-porcelain text-ink">
      <header className="border-b border-hairline bg-surface">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-end justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-tap">
              Operations · Demo Café
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="font-display text-[27px] font-semibold leading-tight tracking-[-0.025em] sm:text-[31px]">
                Reservations control
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-emerald-800">
                <span className="ot-live-dot h-1.5 w-1.5 rounded-full bg-emerald-500 text-emerald-500" aria-hidden="true" />
                Live
              </span>
            </div>
            <p className="mt-1 text-[12px] text-ink-muted">
              {formatDateLong(state.demoNow)} · 14 Harbor Lane · {state.tables.filter((table) => table.isActive && table.status !== "maintenance").length} tables in service
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="rounded-xl border border-hairline bg-porcelain/60 px-3 py-2">
              <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-ink-faint">
                Service clock
              </p>
              <p className="mt-0.5 font-mono text-[14px] font-medium tabular-nums text-ink">
                {formatTime(state.demoNow)}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-hairline bg-porcelain/60 px-2.5 py-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink font-mono text-[9px] font-semibold text-white">
                {opsPersona.initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[11.5px] font-semibold leading-tight">{opsPersona.name}</p>
                <p className="text-[9.5px] text-ink-muted">{opsPersona.role}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate("insights")}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-hairline bg-porcelain/60 text-ink-muted transition hover:border-hairline-strong hover:text-ink"
              aria-label={`Open insights${unread ? `, ${unread} unread notifications` : ""}`}
              title="Enterprise notifications"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              {unread > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-tap px-1 font-mono text-[8px] font-semibold text-white">
                  {unread}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        <div className="ot-date-strip flex gap-1 overflow-x-auto border-t border-hairline px-3 py-2 lg:hidden">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium transition",
                  active ? "bg-ink text-white" : "text-ink-muted hover:bg-porcelain hover:text-ink",
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:grid lg:grid-cols-[218px_1fr] lg:gap-7">
        <aside className="hidden py-6 lg:block">
          <div className="sticky top-[74px]">
            <p className="px-3 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
              Workspace
            </p>
            <nav aria-label="Operations sections" className="mt-2 space-y-1">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = view === item.id;
                const count = counts[item.id];
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(item.id)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[12.5px] font-medium transition",
                      active
                        ? "bg-ink text-white shadow-[0_10px_24px_-20px_rgba(18,21,26,0.8)]"
                        : "text-ink-muted hover:bg-surface hover:text-ink",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span className="flex-1">{item.label}</span>
                    {typeof count === "number" ? (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 font-mono text-[8.5px] font-semibold",
                          active ? "bg-white/15 text-white" : "bg-porcelain text-ink-muted",
                        )}
                      >
                        {count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>

            <div className="mt-6 rounded-2xl border border-hairline bg-surface p-3.5">
              <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-tap">
                Smart allocation
              </p>
              <p className="mt-1.5 text-[11.5px] leading-[1.6] text-ink-muted">
                Per-zone capacity, {state.settings.bufferMinutes}-minute turnover buffer, single →
                combinable → waitlist.
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-[10px] font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                Auto-assignment on
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-brass/25 bg-brass-soft/40 p-3.5">
              <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-brass-dark">
                Waitlist engine
              </p>
              <p className="mt-1.5 text-[11px] leading-[1.6] text-brass-dark">
                {state.waitlist.filter((entry) => entry.status === "waiting").length} waiting ·{" "}
                {waitlistMatches} ready to offer
              </p>
            </div>
          </div>
        </aside>

        <section className="min-w-0 py-5 sm:py-6">
          {view === "overview" ? (
            <Overview onOpenReservation={openReservation} onNavigate={navigate} />
          ) : null}
          {view === "queue" ? <ReservationQueue onOpenReservation={openReservation} /> : null}
          {view === "calendar" ? <CalendarView onOpenReservation={openReservation} /> : null}
          {view === "floor" ? <FloorView onOpenReservation={openReservation} /> : null}
          {view === "insights" ? (
            <Insights onOpenReservation={openReservation} onNavigate={navigate} />
          ) : null}
          {view === "dashboard" ? <PersonalizedDashboard /> : null}
        </section>
      </div>

      <OpsReservationModal
        reservationId={selectedReservationId}
        onClose={() => setSelectedReservationId(null)}
      />
    </div>
  );
}
