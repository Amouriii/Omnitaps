import { useState } from "react";
import { useServerFn } from "../../lib/kk-react-start-shim";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "../kk/ui/button";
import { Input } from "../kk/ui/input";
import { Label } from "../kk/ui/label";
import { Textarea } from "../kk/ui/textarea";
import { createReservation } from "../../lib/kk-koffee.functions";
import { useScrollReveal } from "../../lib/kk-hooks/use-scroll-reveal";
import { useKineticScroll } from "../../lib/kk-hooks/use-kinetic-scroll";
import { useEnterAnimation } from "../../lib/kk-motion";

export function Reserve() {
  const submit = useServerFn(createReservation);
  const sectionRef = useScrollReveal<HTMLElement>();
  useKineticScroll(sectionRef, "[data-reserve-marquee]", 13);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const doneRef = useEnterAnimation<HTMLParagraphElement>(done !== null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    setPending(true);
    try {
      const res = await submit({
        data: {
          guestName: String(form.get("name") ?? ""),
          phone: String(form.get("phone") ?? ""),
          date: String(form.get("date") ?? ""),
          time: String(form.get("time") ?? ""),
          partySize: Number(form.get("party") ?? 0),
          branch: String(form.get("branch") ?? ""),
          notes: String(form.get("notes") ?? ""),
        },
      });
      setDone(res.reservationId);
      formEl.reset();
      toast.success("Table saved — see you soon!");
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
      className="terrazzo relative isolate overflow-x-clip border-y border-border py-16 md:py-24"
    >
      <p
        aria-hidden="true"
        data-reserve-marquee
        className="pointer-events-none absolute -bottom-9 right-0 whitespace-nowrap font-display text-[clamp(5rem,15vw,12rem)] font-extrabold leading-none tracking-[-0.08em] text-wood/15"
      >
        BRUNCH · KULTURE · BRUNCH
      </p>
      <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-[1fr_1.1fr]">
        <div data-reveal>
          <span className="label-mono text-accent">04 — Reserve</span>
          <h2 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">
            Brunch with the whole group
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            Kasual and no deposit — just tell us when you're koming and how many
            kups to line up. We'll konfirm on WhatsApp.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          data-reveal
          className="kk-card grid gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2"
        >
          <Field id="r-name" name="name" label="Name" required minLength={2} />
          <Field
            id="r-phone"
            name="phone"
            label="Mobile"
            required
            placeholder="01xxxxxxxxx"
          />
          <Field id="r-date" name="date" label="Date" type="date" required />
          <Field id="r-time" name="time" label="Time" type="time" required />
          <Field
            id="r-party"
            name="party"
            label="Party size"
            type="number"
            min={1}
            max={30}
            defaultValue={2}
            required
          />
          <Field
            id="r-branch"
            name="branch"
            label="Branch"
            placeholder="Arkan Plaza"
          />
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="r-notes">Notes</Label>
            <Textarea
              id="r-notes"
              name="notes"
              placeholder="Highchair, outdoor seating…"
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="sm:col-span-2"
            disabled={pending}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Reserve a table
          </Button>
          {done && (
            <p
              ref={doneRef}
              className="overflow-hidden rounded-xl bg-primary/30 p-3 text-center text-sm sm:col-span-2"
            >
              Reserved. Reference{" "}
              <span className="font-mono">{done}</span>
            </p>
          )}
        </form>
      </div>
    </section>
  );
}

function Field({
  id,
  label,
  ...props
}: React.ComponentProps<typeof Input> & { id: string; label: string }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...props} />
    </div>
  );
}
