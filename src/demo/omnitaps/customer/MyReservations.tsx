import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  Check,
  Clock,
  Edit3,
  Info,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Ticket,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ADD_ONS, MAX_DAYS_AHEAD, ZONE_LABELS } from "../constants";
import { addOnCents, calculateBookingPrice } from "../pricing";
import { hasAvailabilityOnDate, suggestSlotOptions, tableLabelForIds } from "../smart";
import {
  addDaysKey,
  formatDateLong,
  formatDayChip,
  formatMoney,
  formatTime,
  formatTimeLabel,
  localDateKey,
} from "../time";
import { customerReservations, useDemo } from "../store";
import type { Reservation, ServiceOffering } from "../types";
import {
  EmptyState,
  Field,
  Modal,
  SectionHeading,
  StatusPill,
  cn,
  inputClass,
} from "../ui";
import DigitalPass from "./DigitalPass";

function isUpcoming(reservation: Reservation): boolean {
  return ["pending", "confirmed", "checked_in", "seated", "waitlisted"].includes(reservation.status);
}

export default function MyReservations({
  onBookAgain,
  onBrowse,
}: {
  onBookAgain: (serviceId: string) => void;
  onBrowse: () => void;
}) {
  const { state, customer, actions } = useDemo();
  const reservations = useMemo(
    () => customerReservations(state, customer.id),
    [customer.id, state],
  );
  const upcoming = reservations
    .filter(isUpcoming)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const past = reservations
    .filter((reservation) => !isUpcoming(reservation))
    .sort((a, b) => b.startTime.localeCompare(a.startTime));
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [passTarget, setPassTarget] = useState<Reservation | null>(null);
  const [moveTarget, setMoveTarget] = useState<Reservation | null>(null);
  const [modifyTarget, setModifyTarget] = useState<Reservation | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);

  const list = tab === "upcoming" ? upcoming : past;

  const serviceFor = (reservation: Reservation): ServiceOffering | undefined =>
    state.services.find((service) => service.id === reservation.serviceId);

  const handleCancel = () => {
    if (!cancelTarget) return;
    try {
      const result = actions.cancelReservation(cancelTarget.id);
      toast.success(
        cancelTarget.status === "waitlisted" ? "Left the waitlist" : "Reservation cancelled",
        {
          description:
            result.promoted.length > 0
              ? `${result.promoted.length} waitlist ${result.promoted.length === 1 ? "guest was" : "guests were"} auto-confirmed into the released table.`
              : "No charge was made. The table is back with the floor.",
        },
      );
      setCancelTarget(null);
      if (passTarget?.id === cancelTarget.id) setPassTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel that booking.");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6 sm:py-12">
      <SectionHeading
        eyebrow="Your bookings"
        title="Everything under your name"
        description="Live status, the digital pass, and every change you can make without calling the floor."
        actions={
          <button
            type="button"
            onClick={onBrowse}
            className="cafe-btn inline-flex items-center gap-2 rounded-full bg-tap px-4 py-2.5 text-[12.5px] font-semibold text-white hover:bg-tap-dark"
          >
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            New reservation
          </button>
        }
      />

      <div className="mt-6 inline-flex rounded-full border border-hairline bg-surface p-1">
        {(
          [
            { id: "upcoming", label: "Upcoming", count: upcoming.length },
            { id: "past", label: "Past", count: past.length },
          ] as const
        ).map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setTab(entry.id)}
            aria-pressed={tab === entry.id}
            className={cn(
              "rounded-full px-4 py-1.5 text-[12px] font-semibold transition",
              tab === entry.id ? "bg-ink text-[#faf4ea]" : "text-ink-muted hover:text-ink",
            )}
          >
            {entry.label}
            <span className={cn("ml-1.5 font-mono text-[9px]", tab === entry.id ? "text-white/55" : "text-ink-faint")}>
              {entry.count}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {list.length === 0 ? (
          <EmptyState
            icon={<Ticket className="h-5 w-5" aria-hidden="true" />}
            title={tab === "upcoming" ? "No tables booked yet" : "No past visits yet"}
            description={
              tab === "upcoming"
                ? "Pick an experience and the floor will match a table to your party. It takes less than a minute."
                : "Completed, cancelled, and no-show visits will appear here after service."
            }
            action={
              tab === "upcoming" ? (
                <button
                  type="button"
                  onClick={onBrowse}
                  className="inline-flex items-center gap-2 rounded-full bg-tap px-4 py-2.5 text-[12.5px] font-semibold text-white"
                >
                  Find a table <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null
            }
          />
        ) : null}

        {list.map((reservation) => {
          const service = serviceFor(reservation);
          const canChange = ["pending", "confirmed"].includes(reservation.status);
          const canCancel = ["pending", "confirmed", "checked_in", "waitlisted"].includes(
            reservation.status,
          );
          return (
            <article
              key={reservation.id}
              className="overflow-hidden rounded-3xl border border-hairline bg-surface shadow-[0_18px_44px_-40px_rgba(44,27,18,0.45)]"
            >
              <div className="grid gap-4 p-4 sm:grid-cols-[84px_1fr_auto] sm:items-center sm:p-5">
                <div className="flex w-[72px] flex-col items-center justify-center rounded-2xl border border-hairline bg-porcelain/80 py-3">
                  <span className="font-mono text-[9px] tracking-[0.16em] text-tap">
                    {new Date(reservation.startTime)
                      .toLocaleDateString("en-US", { month: "short" })
                      .toUpperCase()}
                  </span>
                  <span className="font-display text-[29px] font-semibold leading-none">
                    {new Date(reservation.startTime).getDate()}
                  </span>
                  <span className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
                    {new Date(reservation.startTime).toLocaleDateString("en-US", { weekday: "short" })}
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-[20px] font-semibold leading-tight tracking-[-0.02em]">
                      {service?.name ?? "Harbor Lane"}
                    </h3>
                    <StatusPill status={reservation.status} />
                    {reservation.vip ? (
                      <span className="rounded-full border border-brass/30 bg-brass-soft px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-brass-dark">
                        VIP
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatTime(reservation.startTime)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" aria-hidden="true" />
                      {reservation.partySize} {reservation.partySize === 1 ? "guest" : "guests"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      {reservation.status === "waitlisted"
                        ? "Auto-match pending"
                        : `${tableLabelForIds(reservation.tableIds, state.tables)} · ${reservation.zone ? ZONE_LABELS[reservation.zone] : "Harbor Lane"}`}
                    </span>
                  </p>
                  <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-faint">
                    Ref {reservation.reference} · {formatDateLong(reservation.startTime)}
                  </p>
                  {reservation.specialRequests ? (
                    <p className="mt-2 line-clamp-1 text-[11px] text-ink-muted">
                      “{reservation.specialRequests}”
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setPassTarget(reservation)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-tap/30 bg-tap-soft/50 px-3 py-2 text-[11.5px] font-semibold text-tap-dark transition hover:border-tap/60"
                  >
                    <Ticket className="h-3.5 w-3.5" aria-hidden="true" />
                    Pass
                  </button>
                  {canChange ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setModifyTarget(reservation)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3 py-2 text-[11.5px] font-medium text-ink-muted transition hover:border-hairline-strong hover:text-ink"
                      >
                        <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                        Modify
                      </button>
                      <button
                        type="button"
                        onClick={() => setMoveTarget(reservation)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3 py-2 text-[11.5px] font-medium text-ink-muted transition hover:border-hairline-strong hover:text-ink"
                      >
                        <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                        Move
                      </button>
                    </>
                  ) : null}
                  {isUpcoming(reservation) && canCancel ? (
                    <button
                      type="button"
                      onClick={() => setCancelTarget(reservation)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3 py-2 text-[11.5px] font-medium text-ink-faint transition hover:border-[#f3c9c9] hover:bg-[#fdecec] hover:text-[#a33a3a]"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                      {reservation.status === "waitlisted" ? "Leave" : "Cancel"}
                    </button>
                  ) : null}
                  {!isUpcoming(reservation) ? (
                    <button
                      type="button"
                      onClick={() => onBookAgain(reservation.serviceId)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-tap px-3 py-2 text-[11.5px] font-semibold text-white transition hover:bg-tap-dark"
                    >
                      Book again
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              </div>
              {reservation.status === "checked_in" ? (
                <div className="flex items-center gap-2 border-t border-emerald-200 bg-emerald-50 px-5 py-2.5 text-[11px] text-emerald-800">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  Checked in — the host will take you to the table.
                </div>
              ) : null}
              {reservation.status === "seated" ? (
                <div className="flex items-center gap-2 border-t border-emerald-200 bg-emerald-50 px-5 py-2.5 text-[11px] text-emerald-800">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  Seated now. Your server has the booking notes.
                </div>
              ) : null}
              {reservation.status === "waitlisted" ? (
                <div className="flex items-center gap-2 border-t border-brass/20 bg-brass-soft/40 px-5 py-2.5 text-[11px] text-brass-dark">
                  <Info className="h-3.5 w-3.5" aria-hidden="true" />
                  Smart waitlist is on. We'll confirm the first matching table automatically.
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <Modal
        open={Boolean(passTarget)}
        onClose={() => setPassTarget(null)}
        title="Digital reservation pass"
        eyebrow="Demo Café · Harbor Lane"
        description="Show this at the host stand. The QR is your booking reference."
        size="lg"
      >
        {passTarget ? (
          <DigitalPass
            reservation={passTarget}
            service={serviceFor(passTarget)}
            state={state}
          />
        ) : null}
      </Modal>

      {moveTarget ? (
        <RescheduleDialog
          reservation={moveTarget}
          onClose={() => setMoveTarget(null)}
        />
      ) : null}

      {modifyTarget ? (
        <ModifyDialog
          reservation={modifyTarget}
          onClose={() => setModifyTarget(null)}
        />
      ) : null}

      <Modal
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title={cancelTarget?.status === "waitlisted" ? "Leave the waitlist?" : "Cancel this reservation?"}
        eyebrow="No charge · self-service"
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setCancelTarget(null)}
              className="rounded-xl border border-hairline px-4 py-2 text-[12.5px] font-medium text-ink-muted transition hover:text-ink"
            >
              Keep it
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-xl bg-[#a33a3a] px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-[#8c2f2f]"
            >
              {cancelTarget?.status === "waitlisted" ? "Leave waitlist" : "Cancel reservation"}
            </button>
          </>
        }
      >
        <p className="text-[13.5px] leading-[1.7] text-ink-muted">
          {cancelTarget?.status === "waitlisted"
            ? "Your waitlist place will be released. You can rejoin any time."
            : `Reference ${cancelTarget?.reference} will be cancelled. The table goes back to the floor and the smart waitlist may be offered it immediately.`}
        </p>
        {cancelTarget ? (
          <div className="mt-4 rounded-xl border border-hairline bg-porcelain/70 px-3.5 py-3 text-[12px]">
            <p className="font-semibold">
              {serviceFor(cancelTarget)?.name ?? "Harbor Lane"} · {formatTime(cancelTarget.startTime)}
            </p>
            <p className="mt-1 text-ink-muted">
              {formatDateLong(cancelTarget.startTime)} · {cancelTarget.partySize} guests
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function RescheduleDialog({
  reservation,
  onClose,
}: {
  reservation: Reservation;
  onClose: () => void;
}) {
  const { state, actions } = useDemo();
  const service = state.services.find((entry) => entry.id === reservation.serviceId);
  const [dateKey, setDateKey] = useState(() => localDateKey(reservation.startTime));
  const [time, setTime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateOptions = useMemo(() => {
    const todayKey = localDateKey(state.demoNow);
    return Array.from({ length: MAX_DAYS_AHEAD }, (_, index) => addDaysKey(todayKey, index));
  }, [state.demoNow]);

  const options = useMemo(
    () =>
      service
        ? suggestSlotOptions(state, {
            serviceId: service.id,
            dateKey,
            partySize: reservation.partySize,
            excludeReservationId: reservation.id,
          })
        : [],
    [dateKey, reservation.id, reservation.partySize, service, state],
  );

  useEffect(() => {
    if (options.some((option) => option.time === time && option.available)) return;
    const next = options.find((option) => option.available);
    setTime(next?.time ?? null);
  }, [options, time]);

  if (!service) return null;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!time) {
      setError("Choose a new sitting first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      actions.rescheduleReservation(reservation.id, { dateKey, time });
      toast.success("Reservation moved", {
        description: `${formatDateLong(dateKey)} at ${formatTimeLabel(time)}.`,
      });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not move that booking.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Move your reservation"
      eyebrow={`${service.name} · party of ${reservation.partySize}`}
      description="Only live available tables are shown. Moving keeps your reference and details."
      size="lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-hairline px-4 py-2 text-[12.5px] font-medium text-ink-muted"
          >
            Keep current table
          </button>
          <button
            type="submit"
            form="reschedule-form"
            disabled={submitting || !time}
            className="inline-flex items-center gap-2 rounded-xl bg-tap px-4 py-2 text-[12.5px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
            Move reservation
          </button>
        </>
      }
    >
      <form id="reschedule-form" onSubmit={submit} className="space-y-4">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-muted">New date</p>
          <div className="ot-date-strip mt-2 flex gap-2 overflow-x-auto pb-1">
            {dateOptions.map((optionDate) => {
              const active = optionDate === dateKey;
              const chip = formatDayChip(optionDate);
              const available = hasAvailabilityOnDate(state, service.id, optionDate, reservation.partySize);
              return (
                <button
                  key={optionDate}
                  type="button"
                  onClick={() => setDateKey(optionDate)}
                  aria-pressed={active}
                  className={cn(
                    "flex min-w-[58px] shrink-0 flex-col items-center rounded-xl border px-2 py-2 transition",
                    active ? "border-tap bg-tap text-white" : "border-hairline bg-surface",
                  )}
                >
                  <span className={cn("font-mono text-[8px] uppercase", active ? "text-white/65" : "text-ink-faint")}>
                    {chip.weekday}
                  </span>
                  <span className="font-display text-[17px] font-semibold leading-tight">{chip.day}</span>
                  <span className={cn("h-1 w-1 rounded-full", active ? "bg-white" : available ? "bg-emerald-500" : "bg-hairline-strong")} />
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-muted">New sitting</p>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {options.map((option) => (
              <button
                key={option.time}
                type="button"
                disabled={!option.available}
                onClick={() => setTime(option.time)}
                aria-pressed={time === option.time}
                className={cn(
                  "rounded-xl border px-2 py-2.5 text-left transition",
                  time === option.time
                    ? "border-tap bg-tap text-white"
                    : option.available
                      ? "border-hairline bg-surface hover:border-tap/40"
                      : "cursor-not-allowed border-hairline bg-porcelain/40 text-ink-faint",
                )}
              >
                <span className="flex items-center justify-between gap-1">
                  <span className="font-display text-[13.5px] font-semibold">
                    {formatTimeLabel(option.time)}
                  </span>
                  {option.smartPick && option.available ? (
                    <span className={cn("font-mono text-[7px] uppercase", time === option.time ? "text-white/70" : "text-tap")}>
                      Smart
                    </span>
                  ) : null}
                </span>
                <span className={cn("mt-1 block text-[9px]", time === option.time ? "text-white/65" : "text-ink-muted")}>
                  {option.available
                    ? `${option.tablesLeft} table${option.tablesLeft === 1 ? "" : "s"}`
                    : option.past
                      ? "Passed"
                      : "Full"}
                </span>
              </button>
            ))}
          </div>
          {options.every((option) => !option.available) ? (
            <p className="mt-2 text-[11.5px] text-ink-muted">
              No live tables on this date. Try another day or keep the current booking.
            </p>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="rounded-lg border border-[#f3c9c9] bg-[#fdecec] px-3 py-2 text-[11.5px] text-[#a33a3a]">
            {error}
          </p>
        ) : null}
        <p className="flex items-center gap-1.5 text-[10.5px] text-ink-faint">
          <Info className="h-3 w-3" aria-hidden="true" />
          Current table: {tableLabelForIds(reservation.tableIds, state.tables)} ·{" "}
          {formatTime(reservation.startTime)}
        </p>
      </form>
    </Modal>
  );
}

function ModifyDialog({
  reservation,
  onClose,
}: {
  reservation: Reservation;
  onClose: () => void;
}) {
  const { state, actions } = useDemo();
  const service = state.services.find((entry) => entry.id === reservation.serviceId);
  const [partySize, setPartySize] = useState(reservation.partySize);
  const [addOnIds, setAddOnIds] = useState(reservation.addOnIds);
  const [specialRequests, setSpecialRequests] = useState(reservation.specialRequests);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!service) return null;

  const addOns = ADD_ONS.filter((addOn) => service.addOnIds.includes(addOn.id));
  const price = calculateBookingPrice(service, partySize, addOnIds);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      actions.modifyReservation(reservation.id, { partySize, addOnIds, specialRequests });
      toast.success("Booking updated", { description: "The floor has the new details." });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update that booking.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Modify your booking"
      eyebrow={`${service.name} · ${formatTime(reservation.startTime)}`}
      description="Changing the party size can trigger a smart table re-match. You'll see the new table on your pass."
      size="md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-hairline px-4 py-2 text-[12.5px] font-medium text-ink-muted"
          >
            Keep current details
          </button>
          <button
            type="submit"
            form="modify-form"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-tap px-4 py-2 text-[12.5px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
            Save changes
          </button>
        </>
      }
    >
      <form id="modify-form" onSubmit={submit} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-porcelain/60 px-3.5 py-3">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-muted">Party size</p>
            <p className="mt-0.5 text-[11px] text-ink-muted">
              {service.minPartySize}–{service.maxPartySize} guests for this experience
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPartySize((current) => Math.max(service.minPartySize, current - 1))}
              disabled={partySize <= service.minPartySize}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-hairline bg-surface disabled:opacity-35"
              aria-label="Remove one guest"
            >
              <Minus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <span className="min-w-16 text-center text-[13px] font-semibold">{partySize} guests</span>
            <button
              type="button"
              onClick={() => setPartySize((current) => Math.min(service.maxPartySize, current + 1))}
              disabled={partySize >= service.maxPartySize}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-hairline bg-surface disabled:opacity-35"
              aria-label="Add one guest"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-muted">Add-ons</p>
          <div className="mt-2 grid gap-2">
            {addOns.map((addOn) => {
              const active = addOnIds.includes(addOn.id);
              const amount = addOnCents(addOn, partySize);
              return (
                <button
                  key={addOn.id}
                  type="button"
                  onClick={() =>
                    setAddOnIds((current) =>
                      current.includes(addOn.id)
                        ? current.filter((id) => id !== addOn.id)
                        : [...current, addOn.id],
                    )
                  }
                  aria-pressed={active}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                    active ? "border-tap bg-tap-soft/50" : "border-hairline bg-surface",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border",
                      active ? "border-tap bg-tap text-white" : "border-hairline-strong text-transparent",
                    )}
                    aria-hidden="true"
                  >
                    <Check className="h-2.5 w-2.5" />
                  </span>
                  <span className="min-w-0 flex-1 text-[12px]">{addOn.name}</span>
                  <span className="text-[11px] text-ink-muted">
                    {amount === 0 ? "Included" : formatMoney(amount)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <Field label="Special requests" htmlFor="modify-notes">
          <textarea
            id="modify-notes"
            value={specialRequests}
            onChange={(event) => setSpecialRequests(event.target.value)}
            rows={3}
            maxLength={400}
            className={cn(inputClass, "resize-none")}
          />
        </Field>

        <div className="flex items-center justify-between rounded-xl bg-porcelain/70 px-3.5 py-2.5 text-[12px]">
          <span className="text-ink-muted">Updated estimate</span>
          <span className="font-display text-[18px] font-semibold">{formatMoney(price.totalCents)}</span>
        </div>

        {error ? (
          <p role="alert" className="rounded-lg border border-[#f3c9c9] bg-[#fdecec] px-3 py-2 text-[11.5px] text-[#a33a3a]">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
