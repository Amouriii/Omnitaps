import { useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CalendarPlus, Check, Copy, MapPin, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { ADD_ONS, ZONE_LABELS } from "../constants";
import { tableLabelForIds } from "../smart";
import {
  formatDateLong,
  formatDuration,
  formatTime,
} from "../time";
import type { DemoState, Reservation, ServiceOffering } from "../types";
import { StatusPill, cn } from "../ui";

function icsDate(iso: string): string {
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

export function downloadCalendar(reservation: Reservation, service: ServiceOffering | undefined) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Omnitaps//Reservations Demo//EN",
    "BEGIN:VEVENT",
    `UID:${reservation.reference}@demo.omnitaps`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(reservation.startTime)}`,
    `DTEND:${icsDate(reservation.endTime)}`,
    `SUMMARY:${service?.name ?? "Demo Café reservation"} · ${reservation.partySize} guests`,
    "LOCATION:Demo Café, 14 Harbor Lane",
    `DESCRIPTION:Reference ${reservation.reference}. Party of ${reservation.partySize}. ${reservation.specialRequests}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${reservation.reference}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  toast.success("Calendar file downloaded");
}

export default function DigitalPass({
  reservation,
  service,
  state,
  compact = false,
  className,
}: {
  reservation: Reservation;
  service: ServiceOffering | undefined;
  state: DemoState;
  compact?: boolean;
  className?: string;
}) {
  const tables = useMemo(
    () => tableLabelForIds(reservation.tableIds, state.tables),
    [reservation.tableIds, state.tables],
  );
  const addOns = useMemo(
    () =>
      reservation.addOnIds
        .map((id) => ADD_ONS.find((addOn) => addOn.id === id)?.name)
        .filter((value): value is string => Boolean(value)),
    [reservation.addOnIds],
  );
  const isWaitlist = reservation.status === "waitlisted";

  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(reservation.reference);
      toast.success("Reference copied");
    } catch {
      toast.error("Could not copy the reference");
    }
  };

  return (
    <article
      className={cn(
        "ot-ticket ot-pass-dark overflow-hidden rounded-[26px] text-[#faf4ea] shadow-[0_24px_60px_-30px_rgba(33,19,13,0.8)]",
        className,
      )}
    >
      <span className="ot-ticket-notch ot-ticket-notch--left" aria-hidden="true" />
      <span className="ot-ticket-notch ot-ticket-notch--right" aria-hidden="true" />
      <div className="flex items-center justify-between gap-4 border-b border-white/15 px-5 py-4">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#c4a35a]">
            Demo Café · Harbor Lane
          </p>
          <p className="mt-1 font-display text-[20px] font-semibold leading-tight">
            {isWaitlist ? "Waitlist pass" : "Reservation pass"}
          </p>
        </div>
        <StatusPill status={reservation.status} />
      </div>

      <div className="grid gap-5 px-5 py-5 sm:grid-cols-[1fr_auto] sm:items-start">
        <div className="min-w-0">
          <p className="font-display text-[27px] font-semibold leading-tight tracking-[-0.02em]">
            {service?.name ?? "Harbor Lane"}
          </p>
          <p className="mt-1 text-[13px] text-[#faf4ea]/65">
            {formatDateLong(reservation.startTime)} · {formatTime(reservation.startTime)}
          </p>

          <dl className="mt-5 grid grid-cols-2 gap-x-3 gap-y-4 text-[12px]">
            <div>
              <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#faf4ea]/45">Guest</dt>
              <dd className="mt-1 font-medium">{reservation.guestName}</dd>
            </div>
            <div>
              <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#faf4ea]/45">Party</dt>
              <dd className="mt-1 flex items-center gap-1.5 font-medium">
                <Users className="h-3 w-3 text-[#c4a35a]" aria-hidden="true" />
                {reservation.partySize} {reservation.partySize === 1 ? "guest" : "guests"}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#faf4ea]/45">Table</dt>
              <dd className="mt-1 flex items-center gap-1.5 font-medium">
                <MapPin className="h-3 w-3 text-[#c4a35a]" aria-hidden="true" />
                {isWaitlist ? "Auto-match pending" : tables}
                {!isWaitlist && reservation.zone ? (
                  <span className="text-[#faf4ea]/50">· {ZONE_LABELS[reservation.zone]}</span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#faf4ea]/45">Held for</dt>
              <dd className="mt-1 font-medium">
                {formatDuration(Math.round((new Date(reservation.endTime).getTime() - new Date(reservation.startTime).getTime()) / 60_000))}
              </dd>
            </div>
          </dl>

          {addOns.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {addOns.map((name) => (
                <span
                  key={name}
                  className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] text-[#faf4ea]/75"
                >
                  {name}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mx-auto flex w-[132px] flex-col items-center gap-2">
          <div className="rounded-2xl bg-[#fffaf2] p-2.5 shadow-lg">
            <QRCodeSVG
              value={`omnitaps://reservation/${reservation.reference}`}
              size={compact ? 96 : 108}
              bgColor="#fffaf2"
              fgColor="#21130d"
              level="M"
            />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#faf4ea]/55">
            Scan at the host stand
          </p>
        </div>
      </div>

      <div className="mx-5 border-t border-dashed border-white/20" />

      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#faf4ea]/45">Reference</p>
          <button
            type="button"
            onClick={copyReference}
            className="mt-1 inline-flex items-center gap-2 font-mono text-[15px] tracking-[0.12em] text-[#faf4ea] transition hover:text-[#e5c98f]"
            title="Copy booking reference"
          >
            {reservation.reference}
            <Copy className="h-3.5 w-3.5 text-[#c4a35a]" aria-hidden="true" />
          </button>
        </div>
        {isWaitlist ? (
          <p className="flex items-center gap-1.5 text-[11px] text-[#c4a35a]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Auto-offer is on · no charge
          </p>
        ) : (
          <p className="flex items-center gap-1.5 text-[11px] text-[#faf4ea]/55">
            <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            Table held under your name
          </p>
        )}
        <button
          type="button"
          onClick={() => downloadCalendar(reservation, service)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-2.5 py-1.5 text-[11px] font-medium text-[#faf4ea]/80 transition hover:border-white/40 hover:bg-white/10 hover:text-white"
        >
          <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
          Add to calendar
        </button>
      </div>
    </article>
  );
}
