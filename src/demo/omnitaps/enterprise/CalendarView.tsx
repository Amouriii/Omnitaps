import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Star,
} from "lucide-react";
import { ZONE_LABELS } from "../constants";
import { reservationsOnDate } from "../smart";
import {
  addDaysKey,
  formatDateLong,
  formatTime,
  localDateKey,
} from "../time";
import { useDemo } from "../store";
import type { Reservation } from "../types";
import { EmptyState, SectionHeading, cn } from "../ui";

const HOURS = Array.from({ length: 14 }, (_, index) => 9 + index);
const DAY_START = 9 * 60;
const DAY_END = 23 * 60;
const DAY_SPAN = DAY_END - DAY_START;

const BLOCK_STYLES: Record<string, string> = {
  pending: "border-brass/50 bg-brass-soft text-brass-dark",
  confirmed: "border-tap/40 bg-tap-soft text-tap-dark",
  checked_in: "border-[#9fd6c2] bg-[#dcf3ea] text-[#0f6b4f]",
  seated: "border-[#a9d7b0] bg-[#e3f3e5] text-[#2e6b3a]",
  completed: "border-[#d8d2c6] bg-[#f2eee6] text-[#6d655a]",
};

function blockPosition(reservation: Reservation): { left: number; width: number } | null {
  const start = new Date(reservation.startTime);
  const end = new Date(reservation.endTime);
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes() + (end.getDate() !== start.getDate() ? 24 * 60 : 0);
  const clampedStart = Math.max(startMinutes, DAY_START);
  const clampedEnd = Math.min(endMinutes, DAY_END);
  if (clampedEnd <= clampedStart) return null;
  return {
    left: ((clampedStart - DAY_START) / DAY_SPAN) * 100,
    width: ((clampedEnd - clampedStart) / DAY_SPAN) * 100,
  };
}

export default function CalendarView({
  onOpenReservation,
}: {
  onOpenReservation: (reservationId: string) => void;
}) {
  const { state } = useDemo();
  const todayKey = localDateKey(state.demoNow);
  const [dateKey, setDateKey] = useState(todayKey);
  const [zoneFilter, setZoneFilter] = useState("all");

  const dayReservations = useMemo(
    () =>
      reservationsOnDate(state.reservations, dateKey)
        .filter((reservation) => !["cancelled", "no_show", "waitlisted"].includes(reservation.status))
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [dateKey, state.reservations],
  );

  const tables = useMemo(
    () =>
      state.tables
        .filter((table) => table.isActive)
        .filter((table) => zoneFilter === "all" || table.zone === zoneFilter)
        .sort((a, b) => a.zone.localeCompare(b.zone) || a.tableNumber.localeCompare(b.tableNumber)),
    [state.tables, zoneFilter],
  );

  const covers = dayReservations.reduce((sum, reservation) => sum + reservation.partySize, 0);
  const now = new Date(state.demoNow);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const showNowLine = dateKey === todayKey && nowMinutes >= DAY_START && nowMinutes <= DAY_END;
  const nowLeft = ((nowMinutes - DAY_START) / DAY_SPAN) * 100;

  return (
    <div className="space-y-4">
      <SectionHeading
        eyebrow="Day timeline"
        title="The room, hour by hour"
        description="Every table's day at a glance. Click any booking to check in, reassign, move, or complete it."
        actions={
          <div className="inline-flex items-center gap-1 rounded-xl border border-hairline bg-surface p-1">
            <button
              type="button"
              onClick={() => setDateKey(addDaysKey(dateKey, -1))}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted transition hover:bg-porcelain hover:text-ink"
              aria-label="Previous day"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setDateKey(todayKey)}
              className="rounded-lg px-2.5 py-1.5 text-[10.5px] font-semibold text-ink-muted transition hover:bg-porcelain hover:text-ink"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setDateKey(addDaysKey(dateKey, 1))}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted transition hover:bg-porcelain hover:text-ink"
              aria-label="Next day"
            >
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        }
      />

      <div className="rounded-2xl border border-hairline bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-3 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-tap">
                <CalendarDays className="h-3 w-3" aria-hidden="true" />
                {formatDateLong(dateKey)}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-muted">
                {dayReservations.length} bookings · {covers} covers ·{" "}
                {dayReservations.filter((reservation) => reservation.vip).length} VIP
              </p>
            </div>
            <input
              type="date"
              value={dateKey}
              onChange={(event) => {
                if (event.target.value) setDateKey(event.target.value);
              }}
              className="rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-[11px] text-ink-muted outline-none focus:border-tap"
              aria-label="Pick a calendar date"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative inline-flex items-center">
              <span className="sr-only">Zone</span>
              <select
                value={zoneFilter}
                onChange={(event) => setZoneFilter(event.target.value)}
                className="appearance-none rounded-lg border border-hairline bg-surface py-1.5 pl-2.5 pr-7 text-[10.5px] font-medium text-ink-muted outline-none focus:border-tap"
              >
                <option value="all">All zones</option>
                {Object.entries(ZONE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 h-3 w-3 text-ink-faint" aria-hidden="true" />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { status: "confirmed" as const, label: "Confirmed" },
                { status: "checked_in" as const, label: "Checked in" },
                { status: "seated" as const, label: "Seated" },
                { status: "pending" as const, label: "Pending" },
                { status: "completed" as const, label: "Completed" },
              ].map((entry) => (
                <span key={entry.status} className="inline-flex items-center gap-1 text-[9px] text-ink-muted">
                  <span className={cn("h-2 w-2 rounded-sm border", BLOCK_STYLES[entry.status])} aria-hidden="true" />
                  {entry.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {dayReservations.length === 0 ? (
          <div className="px-4 py-8">
            <EmptyState
              icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />}
              title="No bookings on this date"
              description="The floor plan is still available below. Move to another day or open the queue to review future requests."
              action={
                dateKey !== todayKey ? (
                  <button
                    type="button"
                    onClick={() => setDateKey(todayKey)}
                    className="rounded-full bg-tap px-4 py-2 text-[12px] font-semibold text-white"
                  >
                    Back to today
                  </button>
                ) : null
              }
            />
          </div>
        ) : null}

        <div className="ot-scroll-x overflow-x-auto">
          <div className="min-w-[1060px]">
            <div className="grid grid-cols-[168px_1fr] border-b border-hairline bg-porcelain/50">
              <div className="px-3 py-2 font-mono text-[8.5px] uppercase tracking-[0.14em] text-ink-faint">
                Table
              </div>
              <div
                className="grid"
                style={{ gridTemplateColumns: `repeat(${HOURS.length}, minmax(0, 1fr))` }}
              >
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="border-l border-hairline/70 px-1.5 py-2 font-mono text-[8.5px] tabular-nums text-ink-faint"
                  >
                    {String(hour).padStart(2, "0")}:00
                  </div>
                ))}
              </div>
            </div>

            {tables.map((table) => {
              const tableReservations = dayReservations.filter((reservation) =>
                reservation.tableIds.includes(table.id),
              );
              const maintenance = table.status === "maintenance";
              return (
                <div
                  key={table.id}
                  className={cn(
                    "grid grid-cols-[168px_1fr] border-b border-hairline last:border-b-0",
                    maintenance && "bg-porcelain/50",
                  )}
                >
                  <div className="flex items-center gap-2 px-3 py-2">
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-[9px] font-semibold",
                        maintenance ? "bg-[#fdecec] text-[#a33a3a]" : "bg-porcelain text-ink-muted",
                      )}
                    >
                      {table.tableNumber}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[10.5px] font-medium">{table.label}</p>
                      <p className="text-[9px] text-ink-faint">
                        seats {table.minCapacity}–{table.maxCapacity}
                        {maintenance ? " · offline" : ""}
                      </p>
                    </div>
                    {tableReservations.length === 0 ? (
                      <span className="ml-auto text-[8.5px] text-ink-faint">Open</span>
                    ) : null}
                  </div>

                  <div className="relative h-[48px] border-l border-hairline/70">
                    <div
                      className="pointer-events-none absolute inset-0 grid"
                      style={{ gridTemplateColumns: `repeat(${HOURS.length}, minmax(0, 1fr))` }}
                    >
                      {HOURS.map((hour) => (
                        <div key={hour} className="border-l border-hairline/40" />
                      ))}
                    </div>

                    {showNowLine ? (
                      <div
                        className="pointer-events-none absolute bottom-0 top-0 z-20 w-px bg-[#c45c26]"
                        style={{ left: `${nowLeft}%` }}
                        aria-hidden="true"
                      >
                        <span className="absolute -left-[3px] -top-0.5 h-1.5 w-1.5 rounded-full bg-[#c45c26]" />
                      </div>
                    ) : null}

                    {tableReservations.map((reservation) => {
                      const position = blockPosition(reservation);
                      if (!position) return null;
                      return (
                        <button
                          key={reservation.id}
                          type="button"
                          onClick={() => onOpenReservation(reservation.id)}
                          className={cn(
                            "ot-calendar-block absolute top-1 z-10 flex h-[40px] flex-col justify-center overflow-hidden rounded-md border px-1.5 text-left",
                            BLOCK_STYLES[reservation.status] ?? "border-hairline bg-surface text-ink",
                          )}
                          style={{ left: `${position.left}%`, width: `${position.width}%` }}
                          title={`${reservation.guestName} · ${formatTime(reservation.startTime)} · party of ${reservation.partySize} · ${reservation.reference}`}
                        >
                          <span className="flex items-center gap-1 truncate text-[9.5px] font-semibold leading-tight">
                            {reservation.guestName.split(" ")[0]}
                            {reservation.vip ? (
                              <Star className="h-2 w-2 shrink-0 fill-current" aria-hidden="true" />
                            ) : null}
                          </span>
                          <span className="truncate font-mono text-[8px] leading-tight opacity-75">
                            {formatTime(reservation.startTime)} · {reservation.partySize}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline bg-porcelain/40 px-3 py-2 text-[9.5px] text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3 w-3" aria-hidden="true" />
            09:00–23:00 · {tables.length} tables shown
          </span>
          <span>Waitlist requests are in the queue's waitlist tab.</span>
        </div>
      </div>
    </div>
  );
}
