import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  Loader2,
  Minus,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { DemoApiError } from "../api";
import { ADD_ONS, MAX_DAYS_AHEAD, ZONE_LABELS } from "../constants";
import { addOnCents, calculateBookingPrice } from "../pricing";
import { rankTableAllocations, hasAvailabilityOnDate, suggestSlotOptions } from "../smart";
import {
  addDaysKey,
  formatDateLong,
  formatDayChip,
  formatMoney,
  formatTime,
  formatTimeLabel,
  localDateKey,
} from "../time";
import { useDemo } from "../store";
import type {
  CreateReservationResult,
  DemoState,
  ServiceOffering,
  SlotOption,
} from "../types";
import {
  EmptyState,
  Field,
  SectionHeading,
  cn,
  inputClass,
} from "../ui";
import DigitalPass from "./DigitalPass";

const OCCASIONS = [
  { label: "Anniversary", text: "Celebrating an anniversary." },
  { label: "Birthday", text: "Celebrating a birthday." },
  { label: "Quiet corner", text: "A quiet corner would be lovely." },
  { label: "High chair", text: "We'll need a high chair." },
  { label: "Business", text: "A business dinner — please keep it discreet." },
];

const SLOT_GROUPS = [
  { label: "Morning", from: 0, to: 12 },
  { label: "Lunch", from: 12, to: 15 },
  { label: "Afternoon", from: 15, to: 17 },
  { label: "Dinner", from: 17, to: 24 },
];

function clampParty(value: number, service: ServiceOffering): number {
  return Math.min(Math.max(value, service.minPartySize), service.maxPartySize);
}

function firstAvailableDate(state: DemoState, service: ServiceOffering, partySize: number): string {
  const todayKey = localDateKey(state.demoNow);
  for (let offset = 0; offset < MAX_DAYS_AHEAD; offset += 1) {
    const dateKey = addDaysKey(todayKey, offset);
    if (hasAvailabilityOnDate(state, service.id, dateKey, partySize)) return dateKey;
  }
  return todayKey;
}

function sameTableIds(first: string[], second: string[]): boolean {
  if (first.length !== second.length) return false;
  return first.every((id) => second.includes(id));
}

export default function BookingFlow({
  initialServiceId,
  onBack,
  onViewReservations,
}: {
  initialServiceId?: string;
  onBack: () => void;
  onViewReservations: () => void;
}) {
  const { state, customer, actions } = useDemo();
  const fallbackService =
    state.services.find((service) => service.id === "svc_supper") ?? state.services[0];
  const initialService =
    state.services.find((service) => service.id === initialServiceId) ?? fallbackService;
  const initialParty = initialService ? clampParty(2, initialService) : 2;

  const [serviceId, setServiceId] = useState(initialService?.id ?? "svc_supper");
  const [dateKey, setDateKey] = useState(() =>
    initialService ? firstAvailableDate(state, initialService, initialParty) : localDateKey(state.demoNow),
  );
  const [partySize, setPartySize] = useState(initialParty);
  const [time, setTime] = useState<string | null>(null);
  const [selectedTableIds, setSelectedTableIds] = useState<string[] | null>(null);
  const [addOnIds, setAddOnIds] = useState<string[]>([]);
  const [guestName, setGuestName] = useState(customer.name);
  const [guestEmail, setGuestEmail] = useState(customer.email);
  const [guestPhone, setGuestPhone] = useState(customer.phone);
  const [specialRequests, setSpecialRequests] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateReservationResult | null>(null);

  const service = useMemo(
    () => state.services.find((entry) => entry.id === serviceId) ?? fallbackService,
    [fallbackService, serviceId, state.services],
  );

  const dateOptions = useMemo(() => {
    const todayKey = localDateKey(state.demoNow);
    return Array.from({ length: MAX_DAYS_AHEAD }, (_, index) => addDaysKey(todayKey, index));
  }, [state.demoNow]);

  const options = useMemo(
    () => (service ? suggestSlotOptions(state, { serviceId: service.id, dateKey, partySize }) : []),
    [dateKey, partySize, service, state],
  );

  const chosen = useMemo(
    () => options.find((option) => option.time === time) ?? null,
    [options, time],
  );

  const allocationOptions = useMemo(() => {
    if (!service || !chosen?.available) return [];
    return rankTableAllocations({
      tables: state.tables,
      reservations: state.reservations,
      start: new Date(chosen.startTime),
      end: new Date(chosen.endTime),
      partySize,
      preferredZone: service.zone,
    }).slice(0, 3);
  }, [chosen, partySize, service, state.reservations, state.tables]);

  const activeAllocation = useMemo(() => {
    if (selectedTableIds) {
      const selected = allocationOptions.find((option) =>
        sameTableIds(option.tableIds, selectedTableIds),
      );
      if (selected) return selected;
    }
    return allocationOptions[0] ?? chosen?.allocation ?? null;
  }, [allocationOptions, chosen, selectedTableIds]);

  const price = useMemo(
    () =>
      service
        ? calculateBookingPrice(service, partySize, addOnIds)
        : { baseCents: 0, addOnsCents: 0, totalCents: 0, perGuestCents: 0, lines: [] },
    [addOnIds, partySize, service],
  );

  const dateAvailability = useMemo(() => {
    if (!service) return new Map<string, boolean>();
    return new Map(
      dateOptions.map((optionDate) => [
        optionDate,
        hasAvailabilityOnDate(state, service.id, optionDate, partySize),
      ]),
    );
  }, [dateOptions, partySize, service, state]);

  const availableAddOns = useMemo(
    () => (service ? ADD_ONS.filter((addOn) => service.addOnIds.includes(addOn.id)) : []),
    [service],
  );

  useEffect(() => {
    if (result) return;
    if (options.length === 0) {
      setTime(null);
      return;
    }
    const current = time ? options.find((option) => option.time === time) : undefined;
    if (current) return;
    const preferred =
      options.find((option) => option.available && option.smartPick) ??
      options.find((option) => option.available) ??
      options.find((option) => !option.past) ??
      options[0];
    setTime(preferred?.time ?? null);
  }, [options, result, time]);

  useEffect(() => {
    setSelectedTableIds(null);
  }, [dateKey, partySize, serviceId, time]);

  if (!service) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <EmptyState
          title="No experiences are open"
          description="The demo has no bookable services right now. Reset the demo from the top bar."
        />
      </div>
    );
  }

  const changeService = (nextServiceId: string) => {
    const nextService = state.services.find((entry) => entry.id === nextServiceId);
    if (!nextService) return;
    const nextParty = clampParty(partySize, nextService);
    setServiceId(nextServiceId);
    setPartySize(nextParty);
    setAddOnIds((current) => current.filter((id) => nextService.addOnIds.includes(id)));
    setTime(null);
    setSelectedTableIds(null);
    setError(null);
    if (!hasAvailabilityOnDate(state, nextServiceId, dateKey, nextParty)) {
      setDateKey(firstAvailableDate(state, nextService, nextParty));
    }
  };

  const changeParty = (nextParty: number) => {
    setPartySize(clampParty(nextParty, service));
    setError(null);
  };

  const toggleAddOn = (id: string) => {
    setAddOnIds((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
  };

  const toggleOccasion = (text: string) => {
    setSpecialRequests((current) => {
      if (current.includes(text)) {
        return current.replace(text, "").replace(/\s{2,}/g, " ").trim();
      }
      return `${current}${current.trim() ? " " : ""}${text}`.trim();
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    if (!chosen) {
      setError("Choose a sitting first.");
      return;
    }
    if (chosen.past) {
      setError("That sitting has passed. Choose a later time.");
      return;
    }
    if (guestName.trim().length < 2 || !guestEmail.includes("@") || guestPhone.replace(/\D/g, "").length < 6) {
      setError("Add a name, email, and reachable phone number.");
      return;
    }
    if (chosen.available && !activeAllocation) {
      setError("That table was just taken. Choose another sitting or join the waitlist.");
      return;
    }

    setSubmitting(true);
    try {
      const input = {
        serviceId: service.id,
        dateKey,
        time: chosen.time,
        partySize,
        guestName,
        guestEmail,
        guestPhone,
        addOnIds,
        specialRequests,
        tableIds: chosen.available ? activeAllocation?.tableIds : undefined,
        joinWaitlist: !chosen.available,
      };
      const created = chosen.available
        ? actions.createReservation(input)
        : actions.joinWaitlist(input);
      setResult(created);
      toast.success(created.waitlisted ? "You're on the smart waitlist" : "Table confirmed", {
        description: created.waitlisted
          ? "We'll auto-offer the first matching table and notify you here."
          : `${service.name} · ${formatDateLong(created.reservation.startTime)} at ${formatTime(created.reservation.startTime)}.`,
      });
      window.scrollTo({ top: 110, behavior: "smooth" });
    } catch (err) {
      const message =
        err instanceof DemoApiError || err instanceof Error
          ? err.message
          : "That booking could not be completed.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <Confirmation
        result={result}
        state={state}
        service={service}
        onViewReservations={onViewReservations}
        onBookAnother={() => {
          setResult(null);
          setSelectedTableIds(null);
          setSpecialRequests("");
          setAddOnIds([]);
          window.scrollTo({ top: 110, behavior: "smooth" });
        }}
      />
    );
  }

  const visibleGroups = SLOT_GROUPS.map((group) => ({
    ...group,
    options: options.filter((option) => {
      const hour = new Date(option.startTime).getHours();
      return hour >= group.from && hour < group.to;
    }),
  })).filter((group) => group.options.length > 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-muted transition hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
            Step 2 of 2
          </span>
          <span className="h-1 w-20 overflow-hidden rounded-full bg-hairline" aria-hidden="true">
            <span className="block h-full w-full rounded-full bg-tap" />
          </span>
        </div>
      </div>

      <SectionHeading
        eyebrow="Reserve at Harbor Lane"
        title="Build your sitting"
        description="Choose an experience, party size and time. The floor's allocator will pick the table that fits and hold it while you confirm."
        className="mt-4"
      />

      <form onSubmit={handleSubmit} className="mt-8 grid gap-8 lg:grid-cols-[1.55fr_0.85fr] lg:items-start">
        <div className="space-y-8">
          <section aria-labelledby="experience-heading">
            <div className="flex items-center justify-between gap-3">
              <h3 id="experience-heading" className="font-display text-[19px] font-semibold">
                1. Experience
              </h3>
              <span className="text-[11px] text-ink-muted">Tap to switch</span>
            </div>
            <div className="ot-slot-scroll mt-3 flex gap-2 overflow-x-auto pb-1">
              {state.services.map((entry) => {
                const active = entry.id === service.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => changeService(entry.id)}
                    aria-pressed={active}
                    className={cn(
                      "min-w-[168px] shrink-0 rounded-2xl border px-3.5 py-3 text-left transition",
                      active
                        ? "border-tap bg-tap-soft/70 shadow-[0_12px_24px_-22px_rgba(196,92,38,0.7)]"
                        : "border-hairline bg-surface hover:border-hairline-strong",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-display text-[14px] font-semibold leading-tight">
                        {entry.name}
                      </span>
                      {active ? <Check className="h-3.5 w-3.5 text-tap" aria-hidden="true" /> : null}
                    </span>
                    <span className="mt-1 block text-[10.5px] text-ink-muted">
                      {formatMoney(entry.priceCents)} · {entry.durationMinutes} min
                    </span>
                    <span className="mt-0.5 block text-[10px] text-ink-faint">
                      {ZONE_LABELS[entry.zone]}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="date-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 id="date-heading" className="font-display text-[19px] font-semibold">
                  2. Date & party
                </h3>
                <p className="mt-1 text-[12px] text-ink-muted">
                  {service.name} seats {service.minPartySize}–{service.maxPartySize} guests.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-hairline bg-surface px-2 py-1">
                <button
                  type="button"
                  onClick={() => changeParty(partySize - 1)}
                  disabled={partySize <= service.minPartySize}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted transition hover:bg-tap-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"
                  aria-label="Remove one guest"
                >
                  <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <span className="flex items-center gap-1.5 px-1 text-[12.5px] font-semibold">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  {partySize} {partySize === 1 ? "guest" : "guests"}
                </span>
                <button
                  type="button"
                  onClick={() => changeParty(partySize + 1)}
                  disabled={partySize >= service.maxPartySize}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted transition hover:bg-tap-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"
                  aria-label="Add one guest"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="ot-date-strip mt-3 flex gap-2 overflow-x-auto pb-1">
              {dateOptions.map((optionDate) => {
                const active = optionDate === dateKey;
                const chip = formatDayChip(optionDate);
                const available = dateAvailability.get(optionDate) ?? false;
                return (
                  <button
                    key={optionDate}
                    type="button"
                    onClick={() => setDateKey(optionDate)}
                    aria-pressed={active}
                    className={cn(
                      "flex min-w-[64px] shrink-0 flex-col items-center rounded-2xl border px-2 py-2.5 transition",
                      active
                        ? "border-tap bg-tap text-white"
                        : "border-hairline bg-surface hover:border-hairline-strong",
                    )}
                  >
                    <span
                      className={cn(
                        "font-mono text-[9px] uppercase tracking-[0.12em]",
                        active ? "text-white/70" : "text-ink-faint",
                      )}
                    >
                      {chip.weekday}
                    </span>
                    <span className="mt-0.5 font-display text-[19px] font-semibold leading-none">
                      {chip.day}
                    </span>
                    <span className={cn("mt-0.5 text-[9px]", active ? "text-white/65" : "text-ink-faint")}>
                      {chip.month}
                    </span>
                    <span
                      className={cn(
                        "mt-1.5 h-1.5 w-1.5 rounded-full",
                        active
                          ? "bg-white"
                          : available
                            ? "bg-emerald-500"
                            : "bg-hairline-strong",
                      )}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="time-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 id="time-heading" className="font-display text-[19px] font-semibold">
                  3. Sitting
                </h3>
                <p className="mt-1 text-[12px] text-ink-muted">
                  Live table count for {formatDateLong(dateKey)}.{" "}
                  <span className="inline-flex items-center gap-1 font-medium text-tap">
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    Smart picks are ranked by fit, not just vacancy.
                  </span>
                </p>
              </div>
            </div>

            {options.every((option) => option.past) ? (
              <div className="mt-4 rounded-2xl border border-brass/30 bg-brass-soft/50 p-4">
                <p className="text-[13px] font-medium text-ink">Today's sittings have passed.</p>
                <p className="mt-1 text-[12px] text-ink-muted">
                  Pick tomorrow to see live availability.
                </p>
                <button
                  type="button"
                  onClick={() => setDateKey(dateOptions[1] ?? dateKey)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-tap px-3.5 py-2 text-[12px] font-semibold text-white"
                >
                  See tomorrow <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            ) : null}

            <div className="mt-4 space-y-4">
              {visibleGroups.map((group) => (
                <div key={group.label}>
                  <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
                    {group.label}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {group.options.map((option) => (
                      <SlotButton
                        key={option.time}
                        option={option}
                        selected={option.time === time}
                        onSelect={() => {
                          setTime(option.time);
                          setSelectedTableIds(null);
                          setError(null);
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {chosen?.available && activeAllocation ? (
              <div className="mt-5 rounded-2xl border border-tap/25 bg-tap-soft/45 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tap text-white">
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-tap">
                        Smart table match
                      </p>
                      <p className="mt-1 font-display text-[16px] font-semibold">
                        {activeAllocation.reason}
                      </p>
                      <p className="mt-0.5 text-[11.5px] text-ink-muted">
                        Best fit for {partySize} · buffer {state.settings.bufferMinutes} min between
                        sittings.
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full border border-tap/30 bg-surface px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-tap">
                    Held for 10 min
                  </span>
                </div>
                {allocationOptions.length > 1 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {allocationOptions.map((option, index) => {
                      const active = sameTableIds(option.tableIds, activeAllocation.tableIds);
                      return (
                        <button
                          key={option.tableIds.join("-")}
                          type="button"
                          onClick={() => setSelectedTableIds(option.tableIds)}
                          className={cn(
                            "rounded-full border px-2.5 py-1.5 text-[10.5px] font-medium transition",
                            active
                              ? "border-tap bg-tap text-white"
                              : "border-hairline bg-surface text-ink-muted hover:border-tap/40 hover:text-ink",
                          )}
                        >
                          {index === 0 ? "Best fit · " : "Alt · "}
                          {option.tables.map((table) => table.tableNumber).join(" + ")}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}

            {chosen && !chosen.available && !chosen.past ? (
              <div className="mt-5 rounded-2xl border border-brass/35 bg-brass-soft/45 p-4">
                <div className="flex items-start gap-2.5">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-brass-dark" aria-hidden="true" />
                  <div>
                    <p className="text-[13px] font-semibold">That sitting is fully booked.</p>
                    <p className="mt-1 text-[12px] leading-[1.65] text-ink-muted">
                      Join the smart waitlist and the floor will auto-offer you the first matching
                      table. You can cancel any time — no charge.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          <section aria-labelledby="details-heading" className="rounded-3xl border border-hairline bg-surface/70 p-4 sm:p-6">
            <h3 id="details-heading" className="font-display text-[19px] font-semibold">
              4. Your details
            </h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Full name" htmlFor="guest-name">
                <input
                  id="guest-name"
                  value={guestName}
                  onChange={(event) => setGuestName(event.target.value)}
                  className={inputClass}
                  autoComplete="name"
                  placeholder="Name on the booking"
                  required
                />
              </Field>
              <Field label="Phone" htmlFor="guest-phone">
                <input
                  id="guest-phone"
                  value={guestPhone}
                  onChange={(event) => setGuestPhone(event.target.value)}
                  className={inputClass}
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="+20 …"
                  required
                />
              </Field>
              <Field label="Email" htmlFor="guest-email" className="sm:col-span-2">
                <input
                  id="guest-email"
                  value={guestEmail}
                  onChange={(event) => setGuestEmail(event.target.value)}
                  className={inputClass}
                  autoComplete="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                />
              </Field>
            </div>

            <div className="mt-6">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-muted">
                Occasion & requests
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {OCCASIONS.map((occasion) => {
                  const active = specialRequests.includes(occasion.text);
                  return (
                    <button
                      key={occasion.label}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleOccasion(occasion.text)}
                      className={cn(
                        "rounded-full border px-2.5 py-1.5 text-[10.5px] font-medium transition",
                        active
                          ? "border-tap bg-tap text-white"
                          : "border-hairline bg-porcelain/60 text-ink-muted hover:border-tap/40 hover:text-ink",
                      )}
                    >
                      {occasion.label}
                    </button>
                  );
                })}
              </div>
              <textarea
                value={specialRequests}
                onChange={(event) => setSpecialRequests(event.target.value)}
                rows={3}
                maxLength={400}
                placeholder="Allergies, accessibility, a favourite table — anything the floor should know."
                className={cn(inputClass, "mt-3 resize-none")}
              />
              <p className="mt-1 text-right font-mono text-[9px] text-ink-faint">
                {specialRequests.length}/400
              </p>
            </div>
          </section>

          <section aria-labelledby="addons-heading">
            <h3 id="addons-heading" className="font-display text-[19px] font-semibold">
              5. Make it yours
            </h3>
            <p className="mt-1 text-[12px] text-ink-muted">
              Optional touches, prepared before you arrive.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {availableAddOns.map((addOn) => {
                const active = addOnIds.includes(addOn.id);
                const amount = addOnCents(addOn, partySize);
                return (
                  <button
                    key={addOn.id}
                    type="button"
                    onClick={() => toggleAddOn(addOn.id)}
                    aria-pressed={active}
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border p-3.5 text-left transition",
                      active
                        ? "border-tap bg-tap-soft/50"
                        : "border-hairline bg-surface hover:border-hairline-strong",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                        active ? "border-tap bg-tap text-white" : "border-hairline-strong text-transparent",
                      )}
                      aria-hidden="true"
                    >
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-[12.5px] font-semibold">{addOn.name}</span>
                        <span className="shrink-0 text-[11px] font-medium text-ink-muted">
                          {amount === 0 ? "Included" : formatMoney(amount)}
                          {addOn.unit === "guest" && amount > 0 ? (
                            <span className="font-normal text-ink-faint"> / guest</span>
                          ) : null}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-[1.5] text-ink-muted">
                        {addOn.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-[76px]">
          <div className="overflow-hidden rounded-3xl border border-hairline bg-surface shadow-[0_24px_60px_-42px_rgba(44,27,18,0.45)]">
            <div className="border-b border-hairline bg-porcelain/60 px-5 py-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-tap">
                Your reservation
              </p>
              <h2 className="mt-1 font-display text-[23px] font-semibold leading-tight">
                {service.name}
              </h2>
            </div>
            <div className="space-y-3 px-5 py-4 text-[12.5px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-ink-muted">Date</span>
                <span className="font-medium">{formatDateLong(dateKey)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-ink-muted">Sitting</span>
                <span className="font-medium">
                  {chosen ? formatTimeLabel(chosen.time) : "Choose a time"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-ink-muted">Party</span>
                <span className="font-medium">
                  {partySize} {partySize === 1 ? "guest" : "guests"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-ink-muted">Table</span>
                <span className="max-w-[180px] text-right font-medium">
                  {chosen?.available && activeAllocation
                    ? activeAllocation.tables.map((table) => table.tableNumber).join(" + ")
                    : chosen && !chosen.available
                      ? "Waitlist"
                      : "Auto-assigned"}
                </span>
              </div>
              {chosen?.available && activeAllocation ? (
                <p className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10.5px] text-emerald-800">
                  Smart allocation · {activeAllocation.reason}
                </p>
              ) : null}
              {chosen && !chosen.available && !chosen.past ? (
                <p className="rounded-lg bg-brass-soft px-2.5 py-1.5 text-[10.5px] text-brass-dark">
                  Full — joining the waitlist keeps your place automatically.
                </p>
              ) : null}
            </div>

            <div className="ot-dashed-rule mx-5" />

            <div className="space-y-2.5 px-5 py-4 text-[12px]">
              {price.lines.map((line) => (
                <div key={line.id} className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block text-ink">{line.label}</span>
                    <span className="block text-[10px] text-ink-faint">{line.detail}</span>
                  </span>
                  <span className="pt-0.5 font-medium">
                    {line.amountCents === 0 ? "—" : formatMoney(line.amountCents)}
                  </span>
                </div>
              ))}
              <div className="flex items-end justify-between gap-3 border-t border-hairline pt-3">
                <span className="text-[12px] text-ink-muted">Estimated total</span>
                <span className="font-display text-[22px] font-semibold">
                  {formatMoney(price.totalCents)}
                </span>
              </div>
              <p className="text-[10.5px] text-ink-faint">
                No prepayment. Settle at the table; taxes included in this demo.
              </p>
            </div>

            <div className="border-t border-hairline bg-porcelain/50 px-5 py-4">
              {error ? (
                <p role="alert" className="mb-3 rounded-lg border border-[#f3c9c9] bg-[#fdecec] px-2.5 py-2 text-[11px] text-[#a33a3a]">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={submitting || !chosen || chosen.past}
                className="cafe-btn flex w-full items-center justify-center gap-2 rounded-xl bg-tap px-4 py-3 text-[13.5px] font-semibold text-white transition hover:bg-tap-dark disabled:cursor-not-allowed disabled:opacity-45"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Holding your table…
                  </>
                ) : chosen && !chosen.available && !chosen.past ? (
                  <>
                    Join smart waitlist
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </>
                ) : (
                  <>
                    Confirm reservation
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </button>
              <p className="mt-2 text-center text-[10px] text-ink-faint">
                Free changes and cancellation before arrival.
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-hairline bg-surface/60 px-4 py-3 text-[11px] leading-[1.6] text-ink-muted">
            <span className="inline-flex items-center gap-1.5 font-medium text-ink">
              <BadgeCheck className="h-3.5 w-3.5 text-tap" aria-hidden="true" />
              Booking as {customer.name}
            </span>
            <br />
            {customer.tier} member · {customer.visits} visits. Change persona in the demo bar.
          </div>
        </aside>
      </form>
    </div>
  );
}

function SlotButton({
  option,
  selected,
  onSelect,
}: {
  option: SlotOption;
  selected: boolean;
  onSelect: () => void;
}) {
  const isWaitlist = !option.available && !option.past;
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={option.past}
      aria-pressed={selected}
      className={cn(
        "group flex min-h-[68px] flex-col items-start justify-between rounded-xl border px-3 py-2.5 text-left transition",
        selected
          ? "border-tap bg-tap text-white shadow-[0_12px_24px_-18px_rgba(196,92,38,0.8)]"
          : option.past
            ? "cursor-not-allowed border-hairline bg-porcelain/40 text-ink-faint"
            : isWaitlist
              ? "border-dashed border-brass/40 bg-brass-soft/30 hover:border-brass/70"
              : "border-hairline bg-surface hover:border-tap/40 hover:bg-tap-soft/30",
      )}
    >
      <span className="flex w-full items-start justify-between gap-1">
        <span className="font-display text-[15px] font-semibold leading-none">
          {formatTimeLabel(option.time)}
        </span>
        {option.smartPick && option.available ? (
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em]",
              selected ? "bg-white/20 text-white" : "bg-tap-soft text-tap",
            )}
          >
            Smart
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          "mt-2 flex items-center gap-1 text-[9.5px]",
          selected
            ? "text-white/70"
            : option.past
              ? "text-ink-faint"
              : isWaitlist
                ? "text-brass-dark"
                : "text-ink-muted",
        )}
      >
        {option.past
          ? "Passed"
          : isWaitlist
            ? "Waitlist"
            : `${option.tablesLeft} table${option.tablesLeft === 1 ? "" : "s"} left`}
        {option.peak && !option.past ? (
          <span className={cn("ml-auto", selected ? "text-white/50" : "text-ink-faint")}>Peak</span>
        ) : null}
      </span>
    </button>
  );
}

function Confirmation({
  result,
  state,
  service,
  onViewReservations,
  onBookAnother,
}: {
  result: CreateReservationResult;
  state: DemoState;
  service: ServiceOffering;
  onViewReservations: () => void;
  onBookAnother: () => void;
}) {
  const { reservation, waitlisted, waitlistPosition, allocation } = result;
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="ot-reveal text-center">
        <span
          className={cn(
            "mx-auto flex h-14 w-14 items-center justify-center rounded-full",
            waitlisted ? "bg-brass-soft text-brass-dark" : "bg-emerald-100 text-emerald-700",
          )}
        >
          {waitlisted ? <Sparkles className="h-6 w-6" aria-hidden="true" /> : <BadgeCheck className="h-7 w-7" aria-hidden="true" />}
        </span>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-tap">
          {waitlisted ? "Smart waitlist" : "Table confirmed"}
        </p>
        <h1 className="mt-2 font-display text-[36px] font-semibold leading-tight tracking-[-0.03em] sm:text-[44px]">
          {waitlisted ? "You're in the queue." : "Your table is held."}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[14px] leading-[1.7] text-ink-muted">
          {waitlisted
            ? `We're holding place #${waitlistPosition ?? 1} for ${service.name}. If a matching table opens, we'll confirm it automatically and update your pass.`
            : `${service.name} is confirmed for ${reservation.partySize} at ${formatTime(reservation.startTime)}. ${allocation?.reason ?? "The floor has your table ready."}`}
        </p>
      </div>

      <div className="mt-7">
        <DigitalPass reservation={reservation} service={service} state={state} />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: CalendarDays,
            title: waitlisted ? "Auto-offer is on" : "Reminders on",
            body: waitlisted
              ? "No need to refresh. The floor's waitlist engine will notify you."
              : "We'll send a reminder before your sitting.",
          },
          {
            icon: Clock,
            title: "Free changes",
            body: "Reschedule, edit the party, or cancel from My reservations.",
          },
          {
            icon: Users,
            title: "Table held for you",
            body: waitlisted
              ? "Your place is ordered by join time, with VIPs flagged separately."
              : `Party of ${reservation.partySize} · ${reservation.zone ? ZONE_LABELS[reservation.zone] : "Harbor Lane"}.`,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="rounded-2xl border border-hairline bg-surface/70 p-4">
              <Icon className="h-4 w-4 text-tap" aria-hidden="true" />
              <p className="mt-2 text-[12.5px] font-semibold">{item.title}</p>
              <p className="mt-1 text-[11px] leading-[1.6] text-ink-muted">{item.body}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onViewReservations}
          className="inline-flex items-center gap-2 rounded-full bg-tap px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-tap-dark"
        >
          View my reservations
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onBookAnother}
          className="inline-flex items-center gap-2 rounded-full border border-hairline-strong bg-surface px-5 py-2.5 text-[13px] font-semibold text-ink transition hover:border-ink/40"
        >
          Book another table
        </button>
      </div>
    </div>
  );
}
