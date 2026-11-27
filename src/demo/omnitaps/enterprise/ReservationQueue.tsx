import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Hourglass,
  Search,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { getWaitlistMatches, tableLabelForIds } from "../smart";
import { formatDate, formatRelative, formatTime, formatTimeLabel, localDateKey } from "../time";
import { useDemo } from "../store";
import type { Reservation, ReservationStatus, WaitlistEntry } from "../types";
import {
  EmptyState,
  SectionHeading,
  StatusPill,
  cn,
  inputClass,
} from "../ui";

type DateScope = "today" | "upcoming" | "past" | "all";

const QUICK_ACTIONS: Partial<
  Record<ReservationStatus, { label: string; next: ReservationStatus }>
> = {
  pending: { label: "Confirm", next: "confirmed" },
  confirmed: { label: "Check in", next: "checked_in" },
  checked_in: { label: "Seat", next: "seated" },
  seated: { label: "Complete", next: "completed" },
};

export default function ReservationQueue({
  onOpenReservation,
}: {
  onOpenReservation: (reservationId: string) => void;
}) {
  const { state, opsPersona, actions } = useDemo();
  const [mode, setMode] = useState<"bookings" | "waitlist">("bookings");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | ReservationStatus>("all");
  const [serviceId, setServiceId] = useState("all");
  const [dateScope, setDateScope] = useState<DateScope>("today");
  const [zone, setZone] = useState("all");
  const [visible, setVisible] = useState(20);

  const todayKey = localDateKey(state.demoNow);
  const nowMs = new Date(state.demoNow).getTime();
  const matches = useMemo(() => getWaitlistMatches(state), [state]);
  const matchByEntry = useMemo(
    () => new Map(matches.map((match) => [match.entry.id, match])),
    [matches],
  );

  useEffect(() => {
    setVisible(20);
  }, [dateScope, mode, search, serviceId, status, zone]);

  const bookings = useMemo(() => {
    const term = search.trim().toLowerCase();
    return state.reservations
      .filter((reservation) => {
        if (status !== "all" && reservation.status !== status) return false;
        if (serviceId !== "all" && reservation.serviceId !== serviceId) return false;
        if (zone !== "all" && reservation.zone !== zone) return false;
        const dateKey = localDateKey(reservation.startTime);
        if (dateScope === "today" && dateKey !== todayKey) return false;
        if (dateScope === "upcoming" && new Date(reservation.startTime).getTime() < nowMs) return false;
        if (dateScope === "past" && new Date(reservation.startTime).getTime() >= nowMs) return false;
        if (!term) return true;
        const service = state.services.find((entry) => entry.id === reservation.serviceId);
        const tableLabels = tableLabelForIds(reservation.tableIds, state.tables);
        return [reservation.guestName, reservation.reference, service?.name ?? "", tableLabels]
          .join(" ")
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) =>
        dateScope === "past"
          ? b.startTime.localeCompare(a.startTime)
          : a.startTime.localeCompare(b.startTime),
      );
  }, [dateScope, nowMs, search, serviceId, state.reservations, state.services, state.tables, status, todayKey, zone]);

  const waitlist = useMemo(() => {
    const term = search.trim().toLowerCase();
    return state.waitlist
      .filter((entry) => entry.status === "waiting")
      .filter((entry) => {
        if (serviceId !== "all" && entry.serviceId !== serviceId) return false;
        if (dateScope === "today" && entry.desiredDate !== todayKey) return false;
        if (dateScope === "upcoming" && entry.desiredDate < todayKey) return false;
        if (dateScope === "past" && entry.desiredDate >= todayKey) return false;
        if (!term) return true;
        const service = state.services.find((item) => item.id === entry.serviceId);
        return [entry.guestName, entry.reference, service?.name ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
  }, [dateScope, search, serviceId, state.services, state.waitlist, todayKey]);

  const visibleBookings = bookings.slice(0, visible);
  const covers = bookings
    .filter((reservation) => !["cancelled", "waitlisted"].includes(reservation.status))
    .reduce((sum, reservation) => sum + reservation.partySize, 0);

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setServiceId("all");
    setDateScope("today");
    setZone("all");
  };

  const handleQuick = (reservation: Reservation) => {
    const action = QUICK_ACTIONS[reservation.status];
    if (!action) return;
    try {
      const result = actions.setReservationStatus(
        reservation.id,
        action.next,
        opsPersona.name,
      );
      toast.success(`${reservation.guestName} · ${action.label.toLowerCase()}`, {
        description:
          result.promoted.length > 0
            ? `${result.promoted.length} waitlist ${result.promoted.length === 1 ? "guest was" : "guests were"} auto-confirmed into the released table.`
            : `Reference ${reservation.reference}.`,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update that booking.");
    }
  };

  const handlePromote = (entry: WaitlistEntry) => {
    try {
      const result = actions.promoteWaitlistEntry(entry.id, opsPersona.name);
      toast.success("Waitlist guest confirmed", {
        description: `${result.reservation.guestName} · ${result.reservation.reference}.`,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That match is no longer available.");
    }
  };

  const handleAutoFill = () => {
    const result = actions.autoFillWaitlist(opsPersona.name);
    if (result.promoted.length === 0) {
      toast.info("No waitlist matches right now", {
        description: "The engine will keep checking on every cancellation or table release.",
      });
      return;
    }
    toast.success(
      `${result.promoted.length} waitlist ${result.promoted.length === 1 ? "guest" : "guests"} auto-filled`,
      {
        description: result.promoted.map((reservation) => reservation.guestName).join(", "),
      },
    );
  };

  return (
    <div className="space-y-4">
      <SectionHeading
        eyebrow="Operations queue"
        title="Every booking, one table"
        description="Search, filter, and move a booking through its service lifecycle. Actions write to the same state the guest sees."
        actions={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              {bookings.length} bookings · {covers} covers
            </span>
            <button
              type="button"
              onClick={() => setMode(mode === "bookings" ? "waitlist" : "bookings")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-[11.5px] font-medium text-white transition hover:bg-ink/90"
            >
              {mode === "bookings" ? "Waitlist" : "Bookings"}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </>
        }
      />

      <div className="rounded-2xl border border-hairline bg-surface">
        <div className="flex flex-wrap items-center gap-2 border-b border-hairline p-3">
          <label className="relative min-w-[190px] flex-1">
            <span className="sr-only">Search reservations</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search guest, reference, service, table…"
              className={cn(inputClass, "pl-9")}
            />
          </label>

          <Select
            label="Status"
            value={status}
            onChange={(value) => setStatus(value as "all" | ReservationStatus)}
            options={[
              { value: "all", label: "All statuses" },
              { value: "pending", label: "Pending" },
              { value: "confirmed", label: "Confirmed" },
              { value: "checked_in", label: "Checked in" },
              { value: "seated", label: "Seated" },
              { value: "completed", label: "Completed" },
              { value: "waitlisted", label: "Waitlisted" },
              { value: "cancelled", label: "Cancelled" },
              { value: "no_show", label: "No-show" },
            ]}
          />
          <Select
            label="Service"
            value={serviceId}
            onChange={setServiceId}
            options={[
              { value: "all", label: "All services" },
              ...state.services.map((service) => ({ value: service.id, label: service.name })),
            ]}
          />
          <Select
            label="Date"
            value={dateScope}
            onChange={(value) => setDateScope(value as DateScope)}
            options={[
              { value: "today", label: "Today" },
              { value: "upcoming", label: "Upcoming" },
              { value: "past", label: "Past" },
              { value: "all", label: "All dates" },
            ]}
          />
          <Select
            label="Zone"
            value={zone}
            onChange={setZone}
            options={[
              { value: "all", label: "All zones" },
              { value: "dining_room", label: "Dining Room" },
              { value: "terrace", label: "Terrace" },
              { value: "window_bar", label: "Window Bar" },
              { value: "private_salon", label: "Private Salon" },
            ]}
          />
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 rounded-xl border border-hairline px-2.5 py-2 text-[10.5px] font-medium text-ink-muted transition hover:border-hairline-strong hover:text-ink"
          >
            <X className="h-3 w-3" aria-hidden="true" />
            Reset
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-porcelain/40 px-3 py-2">
          <div className="inline-flex rounded-lg border border-hairline bg-surface p-0.5">
            <button
              type="button"
              onClick={() => setMode("bookings")}
              aria-pressed={mode === "bookings"}
              className={cn(
                "rounded-md px-3 py-1.5 text-[10.5px] font-semibold transition",
                mode === "bookings" ? "bg-ink text-white" : "text-ink-muted hover:text-ink",
              )}
            >
              Bookings
            </button>
            <button
              type="button"
              onClick={() => setMode("waitlist")}
              aria-pressed={mode === "waitlist"}
              className={cn(
                "flex items-center gap-1 rounded-md px-3 py-1.5 text-[10.5px] font-semibold transition",
                mode === "waitlist" ? "bg-ink text-white" : "text-ink-muted hover:text-ink",
              )}
            >
              Waitlist
              <span className={cn("rounded-full px-1.5 py-0.5 font-mono text-[8px]", mode === "waitlist" ? "bg-white/15" : "bg-brass-soft text-brass-dark")}>
                {state.waitlist.filter((entry) => entry.status === "waiting").length}
              </span>
            </button>
          </div>
          {mode === "waitlist" ? (
            <button
              type="button"
              onClick={handleAutoFill}
              className="inline-flex items-center gap-1.5 rounded-lg bg-tap px-3 py-1.5 text-[10.5px] font-semibold text-white transition hover:bg-tap-dark"
            >
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              Auto-fill all matches
            </button>
          ) : (
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
              Showing {Math.min(visibleBookings.length, bookings.length)} of {bookings.length}
            </p>
          )}
        </div>

        {mode === "bookings" ? (
          bookings.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<Search className="h-5 w-5" aria-hidden="true" />}
                title="No reservations match"
                description="Try a different date scope, status, or search term."
                action={
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex items-center gap-1.5 rounded-full bg-tap px-4 py-2.5 text-[12px] font-semibold text-white"
                  >
                    Clear filters
                  </button>
                }
              />
            </div>
          ) : (
            <>
              <div className="ot-scroll-x overflow-x-auto">
                <table className="w-full min-w-[1010px] border-collapse text-left text-[11.5px]">
                  <thead>
                    <tr className="border-b border-hairline bg-porcelain/60 font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-faint">
                      <th className="px-3 py-2.5 font-medium">Guest</th>
                      <th className="px-3 py-2.5 font-medium">Experience</th>
                      <th className="px-3 py-2.5 font-medium">Sitting</th>
                      <th className="px-3 py-2.5 font-medium">Party</th>
                      <th className="px-3 py-2.5 font-medium">Table</th>
                      <th className="px-3 py-2.5 font-medium">Status</th>
                      <th className="px-3 py-2.5 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {visibleBookings.map((reservation) => {
                      const service = state.services.find(
                        (entry) => entry.id === reservation.serviceId,
                      );
                      const quick = QUICK_ACTIONS[reservation.status];
                      return (
                        <tr key={reservation.id} className="group transition hover:bg-porcelain/40">
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-porcelain font-mono text-[8px] font-semibold text-ink-muted">
                                {reservation.guestName
                                  .split(" ")
                                  .map((part) => part[0])
                                  .slice(0, 2)
                                  .join("")}
                              </span>
                              <div className="min-w-0">
                                <p className="flex items-center gap-1 truncate font-semibold">
                                  {reservation.guestName}
                                  {reservation.vip ? (
                                    <Star className="h-2.5 w-2.5 fill-brass text-brass" aria-label="VIP" />
                                  ) : null}
                                </p>
                                <p className="font-mono text-[8.5px] text-ink-faint">
                                  {reservation.reference}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <p className="font-medium">{service?.name ?? "—"}</p>
                            <p className="text-[9.5px] text-ink-muted">
                              {reservation.zone ? reservation.zone.replace("_", " ") : "Unassigned"}
                            </p>
                          </td>
                          <td className="px-3 py-2.5">
                            <p className="font-medium tabular-nums">{formatTime(reservation.startTime)}</p>
                            <p className="text-[9.5px] text-ink-muted">
                              {localDateKey(reservation.startTime) === todayKey
                                ? "Today"
                                : formatDate(reservation.startTime, true)}
                            </p>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-1 tabular-nums">
                              <Users className="h-3 w-3 text-ink-faint" aria-hidden="true" />
                              {reservation.partySize}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <p className="font-medium">
                              {reservation.status === "waitlisted"
                                ? "Waitlist"
                                : tableLabelForIds(reservation.tableIds, state.tables)}
                            </p>
                            <p className="text-[9.5px] text-ink-muted">
                              {reservation.source === "walk_in" ? "Walk-in" : reservation.source}
                            </p>
                          </td>
                          <td className="px-3 py-2.5">
                            <StatusPill status={reservation.status} />
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-end gap-1.5">
                              {quick ? (
                                <button
                                  type="button"
                                  onClick={() => handleQuick(reservation)}
                                  className="inline-flex items-center gap-1 rounded-md bg-tap px-2 py-1 text-[9.5px] font-semibold text-white transition hover:bg-tap-dark"
                                >
                                  <Check className="h-2.5 w-2.5" aria-hidden="true" />
                                  {quick.label}
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => onOpenReservation(reservation.id)}
                                className="inline-flex items-center gap-1 rounded-md border border-hairline px-2 py-1 text-[9.5px] font-medium text-ink-muted transition hover:text-ink"
                              >
                                Open
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {visibleBookings.length < bookings.length ? (
                <div className="border-t border-hairline p-3 text-center">
                  <button
                    type="button"
                    onClick={() => setVisible((current) => current + 20)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-3 py-1.5 text-[10.5px] font-medium text-ink-muted transition hover:border-hairline-strong hover:text-ink"
                  >
                    Load 20 more
                    <ChevronDown className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
              ) : null}
            </>
          )
        ) : (
          <div>
            {waitlist.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<Hourglass className="h-5 w-5" aria-hidden="true" />}
                  title="No waitlist requests"
                  description="New requests from the customer portal appear here, ordered by join time."
                />
              </div>
            ) : (
              <div className="ot-scroll-x overflow-x-auto">
                <table className="w-full min-w-[920px] border-collapse text-left text-[11.5px]">
                  <thead>
                    <tr className="border-b border-hairline bg-porcelain/60 font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-faint">
                      <th className="px-3 py-2.5 font-medium">Guest</th>
                      <th className="px-3 py-2.5 font-medium">Experience</th>
                      <th className="px-3 py-2.5 font-medium">Desired</th>
                      <th className="px-3 py-2.5 font-medium">Party</th>
                      <th className="px-3 py-2.5 font-medium">Joined</th>
                      <th className="px-3 py-2.5 font-medium">Smart match</th>
                      <th className="px-3 py-2.5 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {waitlist.map((entry) => {
                      const service = state.services.find((item) => item.id === entry.serviceId);
                      const match = matchByEntry.get(entry.id);
                      return (
                        <tr key={entry.id} className="transition hover:bg-porcelain/40">
                          <td className="px-3 py-2.5">
                            <p className="flex items-center gap-1 font-semibold">
                              {entry.guestName}
                              {entry.vip ? (
                                <Star className="h-2.5 w-2.5 fill-brass text-brass" aria-label="VIP" />
                              ) : null}
                            </p>
                            <p className="font-mono text-[8.5px] text-ink-faint">{entry.reference}</p>
                          </td>
                          <td className="px-3 py-2.5">
                            <p className="font-medium">{service?.name ?? "—"}</p>
                            <p className="text-[9.5px] capitalize text-ink-muted">
                              {entry.preferredZone?.replace("_", " ") ?? "Any zone"}
                            </p>
                          </td>
                          <td className="px-3 py-2.5">
                            <p className="font-medium tabular-nums">{formatTimeLabel(entry.desiredFrom)}</p>
                            <p className="text-[9.5px] text-ink-muted">
                              {entry.desiredDate === todayKey ? "Today" : formatDate(entry.desiredDate, true)}
                            </p>
                          </td>
                          <td className="px-3 py-2.5 tabular-nums">{entry.partySize}</td>
                          <td className="px-3 py-2.5 text-[10px] text-ink-muted">
                            {formatRelative(entry.joinedAt, state.demoNow)}
                          </td>
                          <td className="px-3 py-2.5">
                            {entry.status !== "waiting" ? (
                              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-faint">
                                {entry.status}
                              </span>
                            ) : match ? (
                              <div>
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-emerald-800">
                                  <span className="h-1 w-1 rounded-full bg-emerald-500" aria-hidden="true" />
                                  Match ready
                                </span>
                                <p className="mt-1 max-w-[170px] truncate text-[9px] text-ink-muted">
                                  {match.allocation.reason}
                                </p>
                              </div>
                            ) : (
                              <span className="text-[10px] text-ink-muted">No table yet</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {entry.status === "waiting" ? (
                              <button
                                type="button"
                                onClick={() => handlePromote(entry)}
                                disabled={!match}
                                className="inline-flex items-center gap-1 rounded-md bg-tap px-2 py-1 text-[9.5px] font-semibold text-white transition hover:bg-tap-dark disabled:cursor-not-allowed disabled:opacity-35"
                              >
                                <Check className="h-2.5 w-2.5" aria-hidden="true" />
                                Promote
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="appearance-none rounded-xl border border-hairline bg-surface py-2 pl-3 pr-7 text-[11px] font-medium text-ink-muted outline-none transition hover:border-hairline-strong focus:border-tap"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 h-3 w-3 text-ink-faint" aria-hidden="true" />
    </label>
  );
}
