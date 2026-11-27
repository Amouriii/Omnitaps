import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Clock,
  DoorOpen,
  Mail,
  Phone,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { findBestTableAllocation, tableLabelForIds, validateTableSelection } from "../smart";
import { formatDate, formatMoney, formatRelative, formatTime } from "../time";
import { useDemo } from "../store";
import type { ReservationStatus } from "../types";
import {
  Modal,
  StatusPill,
  cn,
} from "../ui";

const STATUS_ACTIONS: Partial<
  Record<ReservationStatus, Array<{ status: ReservationStatus; label: string }>>
> = {
  pending: [{ status: "confirmed", label: "Confirm booking" }],
  confirmed: [{ status: "checked_in", label: "Check in" }],
  checked_in: [
    { status: "seated", label: "Seat party" },
    { status: "completed", label: "Complete visit" },
  ],
  seated: [{ status: "completed", label: "Complete visit" }],
};

type Tone = "success" | "danger" | "neutral" | "primary";

export default function OpsReservationModal({
  reservationId,
  onClose,
}: {
  reservationId: string | null;
  onClose: () => void;
}) {
  const { state, opsPersona, actions } = useDemo();
  const reservation = reservationId
    ? state.reservations.find((entry) => entry.id === reservationId) ?? null
    : null;
  const service = reservation
    ? state.services.find((entry) => entry.id === reservation.serviceId)
    : undefined;
  const customer = reservation
    ? state.customers.find((entry) => entry.id === reservation.customerId)
    : undefined;
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>(
    reservation?.tableIds ?? [],
  );

  useEffect(() => {
    setSelectedTableIds(reservation?.tableIds ?? []);
  }, [reservation?.id, reservation?.tableIds]);

  const editable = Boolean(
    reservation && !["cancelled", "no_show", "completed", "waitlisted"].includes(reservation.status),
  );

  const validation = useMemo(() => {
    if (!reservation || selectedTableIds.length === 0) return null;
    return validateTableSelection({
      tables: state.tables,
      reservations: state.reservations,
      tableIds: selectedTableIds,
      start: new Date(reservation.startTime),
      end: new Date(reservation.endTime),
      partySize: reservation.partySize,
      excludeReservationId: reservation.id,
    });
  }, [reservation, selectedTableIds, state.reservations, state.tables]);

  const smart = useMemo(() => {
    if (!reservation || !editable) return null;
    return findBestTableAllocation({
      tables: state.tables,
      reservations: state.reservations,
      start: new Date(reservation.startTime),
      end: new Date(reservation.endTime),
      partySize: reservation.partySize,
      preferredZone: reservation.zone ?? undefined,
      excludeReservationId: reservation.id,
    });
  }, [editable, reservation, state.reservations, state.tables]);

  if (!reservation) {
    return (
      <Modal open={Boolean(reservationId)} onClose={onClose} title="Booking not found" size="sm">
        <p className="text-[13px] text-ink-muted">
          This booking no longer exists. Close this panel and refresh the queue.
        </p>
      </Modal>
    );
  }

  const actionsForStatus = STATUS_ACTIONS[reservation.status] ?? [];
  const canCancel = ["pending", "confirmed", "checked_in"].includes(reservation.status);
  const canNoShow = ["pending", "confirmed"].includes(reservation.status);
  const tableLabels = tableLabelForIds(reservation.tableIds, state.tables);
  const addOns = state.addOns.filter((addOn) => reservation.addOnIds.includes(addOn.id));

  const handleStatus = (status: ReservationStatus, tone: Tone = "primary") => {
    try {
      const result = actions.setReservationStatus(reservation.id, status, opsPersona.name);
      const title = `${reservation.guestName} · ${status.replace("_", " ")}`;
      const description =
        result.promoted.length > 0
          ? `${result.promoted.length} waitlist ${result.promoted.length === 1 ? "guest was" : "guests were"} auto-confirmed into the released table.`
          : `Reference ${reservation.reference}.`;
      if (tone === "danger") toast.warning(title, { description });
      else toast.success(title, { description });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update that booking.");
    }
  };

  const toggleTable = (tableId: string) => {
    setSelectedTableIds((current) => {
      if (current.includes(tableId)) return current.filter((id) => id !== tableId);
      if (current.length >= 2) {
        toast.info("Up to two tables can be combined.");
        return current;
      }
      return [...current, tableId];
    });
  };

  const handleSmart = () => {
    if (!smart) {
      toast.info("No table fits this party", {
        description: "Keep the current assignment or open the floor plan to make room.",
      });
      return;
    }
    setSelectedTableIds(smart.tableIds);
    toast.info(`Smart pick: ${tableLabelForIds(smart.tableIds, state.tables)}`, {
      description: `${smart.reason} Save the table to apply it.`,
    });
  };

  const handleAssign = () => {
    if (!validation?.ok) {
      toast.error(validation?.reason ?? "Choose at least one table.");
      return;
    }
    try {
      actions.assignTable(reservation.id, validation.allocation.tableIds, opsPersona.name);
      toast.success(`Table updated for ${reservation.guestName}`, {
        description: validation.allocation.reason,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reassign that table.");
    }
  };

  return (
    <Modal
      open={Boolean(reservationId)}
      onClose={onClose}
      eyebrow={`${reservation.reference} · ${service?.name ?? "Reservation"}`}
      title={`${reservation.guestName}${reservation.vip ? " · VIP" : ""}`}
      description={`${formatDate(reservation.startTime, false)} · ${formatTime(reservation.startTime)}–${formatTime(reservation.endTime)} · party of ${reservation.partySize}`}
      size="xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {canCancel ? (
              <button
                type="button"
                onClick={() => handleStatus("cancelled", "danger")}
                className="inline-flex items-center gap-1 rounded-lg border border-[#f3c9c9] px-3 py-2 text-[10.5px] font-semibold text-[#a33a3a] transition hover:bg-[#fdecec]"
              >
                <X className="h-3 w-3" aria-hidden="true" />
                Cancel booking
              </button>
            ) : null}
            {canNoShow ? (
              <button
                type="button"
                onClick={() => handleStatus("no_show", "danger")}
                className="inline-flex items-center gap-1 rounded-lg border border-hairline px-3 py-2 text-[10.5px] font-medium text-ink-muted transition hover:border-[#f3c9c9] hover:text-[#a33a3a]"
              >
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                No-show
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-hairline px-3 py-2 text-[10.5px] font-medium text-ink-muted transition hover:text-ink"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_1.05fr]">
        <div className="space-y-4">
          <section className="rounded-xl border border-hairline bg-porcelain/30 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StatusPill status={reservation.status} />
              <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-faint">
                {reservation.source.replace("_", " ")} · updated{" "}
                {formatRelative(reservation.updatedAt, state.demoNow)}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Detail label="Guest" value={reservation.guestName} />
              <Detail label="Party" value={`${reservation.partySize} guests`} />
              <Detail label="Experience" value={service?.name ?? "—"} />
              <Detail label="Table" value={reservation.status === "waitlisted" ? "Waitlist" : tableLabels} />
              <Detail label="Zone" value={reservation.zone?.replace("_", " ") ?? "Unassigned"} />
              <Detail label="Total" value={formatMoney(reservation.totalCents)} />
              <Detail
                label="Deposit / source"
                value={reservation.source === "walk_in" ? "Walk-in" : "Card on file"}
              />
              <Detail
                label="Reminder"
                value={
                  reservation.reminderSentAt
                    ? formatRelative(reservation.reminderSentAt, state.demoNow)
                    : "Not sent"
                }
              />
            </div>
            <div className="mt-3 grid gap-2 border-t border-hairline pt-3 text-[10.5px] text-ink-muted">
              <p className="flex items-center gap-1.5">
                <Mail className="h-3 w-3 text-ink-faint" aria-hidden="true" />
                {reservation.guestEmail}
              </p>
              <p className="flex items-center gap-1.5">
                <Phone className="h-3 w-3 text-ink-faint" aria-hidden="true" />
                {reservation.guestPhone}
              </p>
              <p className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-ink-faint" aria-hidden="true" />
                Booked {formatRelative(reservation.createdAt, state.demoNow)}
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-hairline p-3.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[11.5px] font-semibold">Guest profile</h3>
              {customer?.vip ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-brass-soft px-2 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-brass-dark">
                  <Star className="h-2.5 w-2.5 fill-brass" aria-hidden="true" />
                  VIP
                </span>
              ) : null}
            </div>
            <div className="mt-2.5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-tap-soft font-mono text-[11px] font-semibold text-tap">
                {customer?.name
                  .split(" ")
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join("") ?? "G"}
              </span>
              <div>
                <p className="text-[12px] font-semibold">{customer?.name ?? reservation.guestName}</p>
                <p className="text-[10px] text-ink-muted">
                  {customer?.tier ?? "Guest"} · {customer?.visits ?? 0} visits · member since{" "}
                  {customer?.memberSince ?? "—"}
                </p>
              </div>
            </div>
            <div className="mt-3 space-y-2 text-[10.5px] leading-[1.6]">
              <div>
                <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-ink-faint">
                  Special requests
                </p>
                <p className="mt-0.5 text-ink-muted">
                  {reservation.specialRequests || "None recorded."}
                </p>
              </div>
              <div>
                <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-ink-faint">
                  Guest notes
                </p>
                <p className="mt-0.5 text-ink-muted">{customer?.notes || "No notes."}</p>
              </div>
              {addOns.length > 0 ? (
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-ink-faint">
                    Add-ons
                  </p>
                  <p className="mt-0.5 text-ink-muted">
                    {addOns.map((addOn) => addOn.name).join(" · ")}
                  </p>
                </div>
              ) : null}
              {reservation.internalNote ? (
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-ink-faint">
                    Internal note
                  </p>
                  <p className="mt-0.5 text-ink-muted">{reservation.internalNote}</p>
                </div>
              ) : null}
              {reservation.waitlistEntryId ? (
                <p className="rounded-lg bg-tap-soft/50 px-2.5 py-2 text-[10px] text-tap-dark">
                  Originally joined the waitlist. Reference {reservation.reference}.
                </p>
              ) : null}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-xl border border-hairline p-3.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-[11.5px] font-semibold">Table assignment</h3>
                <p className="mt-0.5 text-[10px] text-ink-muted">
                  {editable
                    ? "Pick one table, or combine two in the same zone."
                    : "This booking is closed and no longer holds a table."}
                </p>
              </div>
              {editable ? (
                <button
                  type="button"
                  onClick={handleSmart}
                  className="inline-flex items-center gap-1 rounded-lg bg-tap-soft px-2.5 py-1.5 text-[9.5px] font-semibold text-tap-dark transition hover:bg-tap/15"
                >
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  Smart assign
                </button>
              ) : null}
            </div>

            {editable ? (
              <>
                <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {state.tables
                    .filter((table) => table.isActive)
                    .map((table) => {
                      const selected = selectedTableIds.includes(table.id);
                      const offline = table.status === "maintenance";
                      return (
                        <button
                          key={table.id}
                          type="button"
                          onClick={() => toggleTable(table.id)}
                          disabled={offline}
                          className={cn(
                            "rounded-lg border px-2 py-2 text-left transition",
                            selected
                              ? "border-tap bg-tap-soft text-tap-dark"
                              : "border-hairline text-ink-muted hover:border-hairline-strong",
                            offline && "cursor-not-allowed opacity-40",
                          )}
                        >
                          <p className="flex items-center justify-between font-mono text-[9px] font-semibold">
                            {table.tableNumber}
                            {selected ? <Check className="h-2.5 w-2.5" aria-hidden="true" /> : null}
                          </p>
                          <p className="mt-0.5 truncate text-[8.5px]">
                            {table.label} · {table.maxCapacity}
                          </p>
                        </button>
                      );
                    })}
                </div>

                <div className="mt-3 rounded-lg bg-porcelain/60 px-2.5 py-2 text-[10px]">
                  {selectedTableIds.length === 0 ? (
                    <span className="text-ink-muted">Choose at least one table.</span>
                  ) : validation?.ok ? (
                    <span className="text-emerald-700">{validation.allocation.reason}</span>
                  ) : (
                    <span className="text-[#a33a3a]">{validation?.reason}</span>
                  )}
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTableIds(reservation.tableIds)}
                    className="text-[9.5px] font-medium text-ink-muted underline-offset-2 hover:underline"
                  >
                    Use current table
                  </button>
                  <button
                    type="button"
                    onClick={handleAssign}
                    disabled={!validation?.ok}
                    className="inline-flex items-center gap-1 rounded-lg bg-ink px-3 py-2 text-[10px] font-semibold text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Save table
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
              </>
            ) : (
              <p className="mt-3 rounded-lg bg-porcelain/60 px-3 py-2.5 text-[11px] text-ink-muted">
                {tableLabels}
              </p>
            )}
          </section>

          <section className="rounded-xl border border-hairline p-3.5">
            <h3 className="text-[11.5px] font-semibold">Quick actions</h3>
            {actionsForStatus.length === 0 ? (
              <p className="mt-2 text-[10.5px] leading-[1.6] text-ink-muted">
                This booking is finalised. No further status changes are available.
              </p>
            ) : (
              <div className="mt-2 grid gap-1.5">
                {actionsForStatus.map((action) => (
                  <button
                    key={action.status}
                    type="button"
                    onClick={() => handleStatus(action.status)}
                    className="flex items-center justify-between rounded-lg border border-hairline px-3 py-2.5 text-[10.5px] font-medium transition hover:border-tap/30 hover:bg-tap-soft/40"
                  >
                    <span className="flex items-center gap-2">
                      {action.status === "checked_in" ? (
                        <DoorOpen className="h-3.5 w-3.5 text-tap" aria-hidden="true" />
                      ) : (
                        <Users className="h-3.5 w-3.5 text-tap" aria-hidden="true" />
                      )}
                      {action.label}
                    </span>
                    <ArrowRight className="h-3 w-3 text-ink-faint" aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
            <div className="mt-3 border-t border-hairline pt-2.5">
              <button
                type="button"
                onClick={() => {
                  try {
                    actions.sendReminder(reservation.id, opsPersona.name);
                    toast.success(`Reminder sent to ${reservation.guestName}`);
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Could not send the reminder.");
                  }
                }}
                disabled={!["pending", "confirmed", "checked_in"].includes(reservation.status)}
                className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-tap disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                Send a reminder
              </button>
            </div>
          </section>
        </div>
      </div>
    </Modal>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-ink-faint">{label}</p>
      <p className="mt-0.5 text-[10.5px] font-medium capitalize">{value}</p>
    </div>
  );
}

