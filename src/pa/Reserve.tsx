import { useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  Loader2,
  MessageCircle,
  Phone,
  Users,
} from "lucide-react";
import { useServerFn } from "../../lib/kk-react-start-shim";
import { toast } from "sonner";

import { Button } from "../kk/ui/button";
import { Input } from "../kk/ui/input";
import { Label } from "../kk/ui/label";
import { Textarea } from "../kk/ui/textarea";
import { createReservation } from "../../lib/pa-demo.functions";
import { WHATSAPP_NUMBER } from "./menu";
import { useScrollReveal } from "../../lib/pa-hooks/use-scroll-reveal";
import { useKineticScroll } from "../../lib/pa-hooks/use-kinetic-scroll";
import {
  useEnterAnimation,
  useNeonFlicker,
  usePressFeedback,
} from "../../lib/pa-motion";

export function Reserve() {
  const submit = useServerFn(createReservation);
  const sectionRef = useScrollReveal<HTMLElement>();
  useKineticScroll(sectionRef, "[data-reserve-marquee]", 13);
  const headingRef = useNeonFlicker<HTMLHeadingElement>();
  const [pending, setPending] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    reservationId: string;
    ownerNotified: boolean;
    details: {
      guestName: string;
      phone: string;
      date: string;
      time: string;
      partySize: number;
      branch: string;
      notes: string;
    };
  } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const details = {
      guestName: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      date: String(form.get("date") ?? ""),
      time: String(form.get("time") ?? ""),
      partySize: Number(form.get("party") ?? 0),
      branch: String(form.get("branch") ?? ""),
      notes: String(form.get("notes") ?? ""),
    };
    setPending(true);
    try {
      const res = await submit({ data: details });
      setConfirmation({ ...res, details });
      formEl.reset();
      toast.success("Table saved, see you under the neon!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't save that. Try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      id="reserve"
      ref={sectionRef}
      className="pa-checkerboard-edge relative isolate overflow-x-clip bg-[#232323] py-20 md:py-28"
    >
      <p
        aria-hidden="true"
        data-reserve-marquee
        className="pointer-events-none absolute -bottom-9 right-0 whitespace-nowrap font-display text-[clamp(5rem,15vw,12rem)] leading-none text-white/[0.04]"
      >
        SEE YOU · SOON · SEE YOU
      </p>

      <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-[1fr_1.1fr]">
        <div data-reveal>
          <span className="label-mono text-[#29D9FF]">04 · Reserve</span>
          <h2
            ref={headingRef}
            className="mt-4 font-display text-4xl leading-[1.02] text-white sm:text-5xl"
          >
            Grab a booth,{" "}
            <span className="text-[#F2597F] [text-shadow:0_0_18px_#F2597F88]">
              walk-ins always welcome
            </span>
          </h2>
          <p className="mt-4 max-w-md text-white/70">
            No deposit, no fuss. It's a casual diner. Tell us when you're
            coming and how many are with you, and we'll have the corner ready.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          data-reveal
          className="pa-card grid gap-4 rounded-2xl border border-[#C4C8CC]/25 bg-white/[0.03] p-6 sm:grid-cols-2"
        >
          <Field
            id="r-name"
            name="name"
            label="Name"
            required
            minLength={2}
            autoComplete="name"
          />
          <Field
            id="r-phone"
            name="phone"
            label="Mobile"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            placeholder="01x xxx xxxxx"
          />
          <Field
            id="r-date"
            name="date"
            label="Date"
            type="date"
            autoComplete="off"
            required
          />
          <Field
            id="r-time"
            name="time"
            label="Time"
            type="time"
            autoComplete="off"
            required
          />
          <Field
            id="r-party"
            name="party"
            label="Party size"
            type="number"
            inputMode="numeric"
            min={1}
            max={30}
            defaultValue={2}
            autoComplete="off"
            required
          />
          <Field
            id="r-branch"
            name="branch"
            label="Where"
            placeholder="Heliopolis, Omar Ibn El-Khattab"
            autoComplete="off"
          />
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="r-notes" className="text-white/80">
              Notes
            </Label>
            <Textarea
              id="r-notes"
              name="notes"
              placeholder="Kids' highchair, birthday candles, big group…"
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="pa-cta sm:col-span-2"
            disabled={pending}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Reserve a booth
          </Button>
          {confirmation && (
            <ReservationConfirmation
              confirmation={confirmation}
              onDismiss={() => setConfirmation(null)}
            />
          )}
        </form>
      </div>
    </section>
  );
}

function ReservationConfirmation({
  confirmation,
  onDismiss,
}: {
  confirmation: {
    reservationId: string;
    ownerNotified: boolean;
    details: {
      guestName: string;
      phone: string;
      date: string;
      time: string;
      partySize: number;
      branch: string;
      notes: string;
    };
  };
  onDismiss: () => void;
}) {
  const { reservationId, ownerNotified, details } = confirmation;
  const press = usePressFeedback();
  const confirmedRef = useEnterAnimation<HTMLDivElement>(true);
  const prettyDate = new Date(`${details.date}T00:00:00`).toLocaleDateString(
    "en-GB",
    { weekday: "long", day: "numeric", month: "long" },
  );
  const waText = encodeURIComponent(
    "Hi Pablo & Abdo! I just booked a table online, forwarding my reservation.\n" +
      `Ref: ${reservationId.slice(0, 8)}\n` +
      `👤 ${details.guestName}, ${details.partySize} people\n` +
      `📅 ${details.date} at ${details.time}\n` +
      `📞 ${details.phone}` +
      (details.notes ? `\n📝 ${details.notes}` : ""),
  );

  return (
    <div
      ref={confirmedRef}
      role="status"
      className="grid gap-4 rounded-2xl border border-[#29D9FF]/40 bg-[#29D9FF]/[0.07] p-5 sm:col-span-2"
    >
      <div className="flex items-center gap-2.5">
        <BadgeCheck className="h-5 w-5 shrink-0 text-[#29D9FF]" />
        <p className="font-display text-lg text-white">
          Table confirmed, see you under the neon!
        </p>
      </div>

      <dl className="grid gap-2 text-sm text-white/85">
        <div className="flex items-center gap-2.5">
          <CalendarDays className="h-4 w-4 shrink-0 text-[#F2597F]" />
          <dd>
            {prettyDate} at{" "}
            <span className="font-mono text-white">{details.time}</span>
          </dd>
        </div>
        <div className="flex items-center gap-2.5">
          <Users className="h-4 w-4 shrink-0 text-[#F2597F]" />
          <dd>
            {details.partySize} {details.partySize === 1 ? "person" : "people"}
          </dd>
        </div>
        <div className="flex items-center gap-2.5">
          <Phone className="h-4 w-4 shrink-0 text-[#F2597F]" />
          <dd>
            {details.phone} · under {""}
            <span className="text-white">{details.guestName}</span>
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-xs tracking-widest text-white/50">
          REF {reservationId.slice(0, 8).toUpperCase()}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-white/50 underline-offset-4 hover:text-white/80 hover:underline"
        >
          Book another table
        </button>
      </div>

      {WHATSAPP_NUMBER ? (
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${waText}`}
          target="_blank"
          rel="noreferrer"
          {...press}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 font-display text-sm text-[#0c2b12] transition-transform hover:scale-[1.02]"
        >
          <MessageCircle className="h-4 w-4" />
          {ownerNotified
            ? "Forward to the diner on WhatsApp"
            : "Send your booking to the diner on WhatsApp"}
        </a>
      ) : (
        <p className="text-center text-xs text-white/50">
          Tip: tap the green WhatsApp bubble anytime to reach us directly.
        </p>
      )}

      <p className="text-center text-xs text-white/45">
        Walk-ins always welcome. Need to change plans? Just message us.
      </p>
    </div>
  );
}

function Field({
  id,
  label,
  ...props
}: React.ComponentProps<typeof Input> & { id: string; label: string }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-white/80">
        {label}
      </Label>
      <Input id={id} {...props} className="pa-input" />
    </div>
  );
}
