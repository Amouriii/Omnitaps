import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { ZONES, ZONE_LABELS } from "../constants";
import { getTableLiveState, getTableZoneSummary } from "../smart";
import { formatTime } from "../time";
import { useDemo } from "../store";
import type { RestaurantTable, TableLiveState } from "../types";
import { SectionHeading, StatusPill, cn } from "../ui";

const LIVE_STYLES = {
  available: {
    label: "Available",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-800",
    dot: "bg-emerald-500",
    card: "border-hairline",
  },
  reserved: {
    label: "Reserved",
    chip: "border-tap/25 bg-tap-soft text-tap-dark",
    dot: "bg-tap",
    card: "border-tap/30",
  },
  occupied: {
    label: "Occupied",
    chip: "border-brass/35 bg-brass-soft text-brass-dark",
    dot: "bg-brass",
    card: "border-brass/35",
  },
  maintenance: {
    label: "Maintenance",
    chip: "border-[#f3c9c9] bg-[#fdecec] text-[#a33a3a]",
    dot: "bg-[#a33a3a]",
    card: "border-[#f3c9c9] bg-porcelain/60",
  },
} as const;

export default function FloorView({
  onOpenReservation,
}: {
  onOpenReservation: (reservationId: string) => void;
}) {
  const { state, opsPersona, actions } = useDemo();
  const [zoneFilter, setZoneFilter] = useState("all");
  const summary = useMemo(() => getTableZoneSummary(state), [state]);
  const liveTables = useMemo(
    () =>
      state.tables
        .filter((table) => table.isActive)
        .filter((table) => zoneFilter === "all" || table.zone === zoneFilter)
        .sort((a, b) => a.zone.localeCompare(b.zone) || a.tableNumber.localeCompare(b.tableNumber))
        .map((table) => getTableLiveState(state, table)),
    [state, zoneFilter],
  );

  const counts = liveTables.reduce(
    (totals, live) => {
      totals[live.state] += 1;
      return totals;
    },
    { available: 0, reserved: 0, occupied: 0, maintenance: 0 },
  );

  const toggleTable = (table: RestaurantTable, live: TableLiveState) => {
    const offline = table.status === "maintenance";
    if (!offline && live.state === "occupied") {
      toast.error(`${table.tableNumber} is occupied`, {
        description: "Complete the visit or reassign the party before taking it offline.",
      });
      return;
    }
    try {
      actions.setTableStatus(
        table.id,
        offline ? "available" : "maintenance",
        opsPersona.name,
      );
      if (!offline && (live.nextReservation || live.currentReservation)) {
        toast.warning(`${table.tableNumber} is offline`, {
          description:
            "A booking still points at this table. Reassign it from the booking before service.",
        });
      } else {
        toast.success(offline ? `${table.tableNumber} back in service` : `${table.tableNumber} offline`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update that table.");
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeading
        eyebrow="Floor & capacity"
        title="Every table, live"
        description="Available, reserved, occupied, or offline. Manual overrides write into the same allocation engine that assigns new bookings."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-emerald-800">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              Auto-assignment on
            </span>
            <label className="relative inline-flex items-center">
              <span className="sr-only">Zone filter</span>
              <select
                value={zoneFilter}
                onChange={(event) => setZoneFilter(event.target.value)}
                className="appearance-none rounded-xl border border-hairline bg-surface py-2 pl-3 pr-7 text-[11px] font-medium text-ink-muted outline-none focus:border-tap"
              >
                <option value="all">All zones</option>
                {ZONES.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 h-3 w-3 text-ink-faint" aria-hidden="true" />
            </label>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {(
          [
            { key: "available" as const, label: "Available" },
            { key: "reserved" as const, label: "Reserved" },
            { key: "occupied" as const, label: "Occupied" },
            { key: "maintenance" as const, label: "Offline" },
          ]
        ).map((entry) => {
          const style = LIVE_STYLES[entry.key];
          return (
            <div key={entry.key} className="rounded-xl border border-hairline bg-surface px-3 py-2.5">
              <p className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-ink-muted">
                <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} aria-hidden="true" />
                {entry.label}
              </p>
              <p className="mt-1 font-display text-[22px] font-semibold leading-none">{counts[entry.key]}</p>
            </div>
          );
        })}
      </div>

      {ZONES.filter((zone) => zoneFilter === "all" || zone.id === zoneFilter).map((zone) => {
        const zoneLive = liveTables.filter((live) => live.table.zone === zone.id);
        const zoneStats = summary.find((entry) => entry.zone === zone.id);
        const held = zoneLive.filter((live) => ["occupied", "reserved"].includes(live.state)).length;
        const utilization = zoneLive.length ? held / zoneLive.length : 0;
        return (
          <section key={zone.id} className="rounded-2xl border border-hairline bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-3">
              <div>
                <h2 className="font-display text-[18px] font-semibold">{zone.label}</h2>
                <p className="mt-0.5 text-[10.5px] text-ink-muted">
                  {zone.description} · {zoneLive.length} tables
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden w-28 sm:block">
                  <div className="flex justify-between font-mono text-[8px] uppercase tracking-[0.1em] text-ink-faint">
                    <span>Utilization</span>
                    <span>{Math.round(utilization * 100)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-porcelain">
                    <div className="h-full rounded-full bg-tap" style={{ width: `${Math.round(utilization * 100)}%` }} />
                  </div>
                </div>
                <span className="rounded-full bg-porcelain px-2.5 py-1 font-mono text-[9px] text-ink-muted">
                  {zoneStats?.occupied ?? 0} seated · {zoneStats?.reserved ?? 0} held
                </span>
              </div>
            </div>

            <div className="grid gap-2.5 p-3 sm:grid-cols-2 xl:grid-cols-3">
              {zoneLive.map((live) => {
                const style = LIVE_STYLES[live.state];
                const booking = live.currentReservation ?? live.nextReservation;
                const offline = live.state === "maintenance";
                return (
                  <article
                    key={live.table.id}
                    className={cn(
                      "ot-table-tile relative flex flex-col rounded-xl border bg-surface p-3",
                      style.card,
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg font-mono text-[10px] font-semibold",
                            offline ? "bg-[#fdecec] text-[#a33a3a]" : "bg-porcelain text-ink",
                          )}
                        >
                          {live.table.tableNumber}
                        </span>
                        <div>
                          <p className="text-[11.5px] font-semibold leading-tight">{live.table.label}</p>
                          <p className="mt-0.5 flex items-center gap-1 text-[9px] text-ink-muted">
                            <Users className="h-2.5 w-2.5" aria-hidden="true" />
                            {live.table.minCapacity}–{live.table.maxCapacity} seats
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em]",
                          style.chip,
                        )}
                      >
                        <span className={cn("h-1 w-1 rounded-full", style.dot)} aria-hidden="true" />
                        {style.label}
                      </span>
                    </div>

                    <div className="mt-3 min-h-[42px] rounded-lg bg-porcelain/50 px-2.5 py-2">
                      {offline ? (
                        <p className="text-[10.5px] text-ink-muted">
                          Offline for maintenance. The allocator is skipping this table.
                        </p>
                      ) : booking ? (
                        <>
                          <p className="flex items-center gap-1 truncate text-[10.5px] font-semibold">
                            {booking.guestName}
                            {booking.vip ? <span className="text-[8px] text-brass">VIP</span> : null}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-[9.5px] text-ink-muted">
                            <Clock className="h-2.5 w-2.5" aria-hidden="true" />
                            {live.state === "occupied" ? "Now" : formatTime(booking.startTime)} ·{" "}
                            {booking.partySize} guests · {booking.reference}
                          </p>
                        </>
                      ) : (
                        <p className="text-[10.5px] text-ink-muted">Open for walk-ins.</p>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-ink-faint">
                        {live.table.shape} · {ZONE_LABELS[live.table.zone]}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {booking ? (
                          <button
                            type="button"
                            onClick={() => onOpenReservation(booking.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-hairline px-2 py-1 text-[9px] font-medium text-ink-muted transition hover:text-ink"
                          >
                            Open <ArrowRight className="h-2.5 w-2.5" aria-hidden="true" />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => toggleTable(live.table, live)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[9px] font-semibold transition",
                            offline
                              ? "bg-ink text-white hover:bg-ink/90"
                              : live.state === "occupied"
                                ? "cursor-not-allowed bg-porcelain text-ink-faint"
                                : "border border-hairline text-ink-muted hover:border-[#f3c9c9] hover:text-[#a33a3a]",
                          )}
                          disabled={!offline && live.state === "occupied"}
                        >
                          {offline ? (
                            <>
                              <Check className="h-2.5 w-2.5" aria-hidden="true" /> Return
                            </>
                          ) : (
                            <>
                              <Wrench className="h-2.5 w-2.5" aria-hidden="true" /> Offline
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface px-4 py-3">
        <p className="flex items-center gap-2 text-[11px] text-ink-muted">
          <StatusPill status="confirmed" />
          Manual overrides are immediate and visible to the customer portal.
        </p>
        <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-faint">
          {state.settings.bufferMinutes}-minute turnover buffer · per-zone capacity
        </p>
      </div>
    </div>
  );
}
