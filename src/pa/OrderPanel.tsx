import { useMemo, useRef, useState } from "react";
import { useServerFn } from "../../lib/kk-react-start-shim";
import {
  Minus,
  Plus,
  Trash2,
  Loader2,
  Banknote,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "../kk/ui/button";
import { Input } from "../kk/ui/input";
import { Label } from "../kk/ui/label";
import { Textarea } from "../kk/ui/textarea";
import { egp, DELIVERY_FEE, TAX_RATE } from "./menu";
import { placeOrder } from "../../lib/pa-demo.functions";
import type { CartLine } from "./cart";
import { useScrollReveal } from "../../lib/pa-hooks/use-scroll-reveal";
import { animateOut, useEnterAnimation, usePressFeedback } from "../../lib/pa-motion";

type OrderType = "pickup" | "delivery" | "dinein";
type PaymentMethod = "card" | "cash";

const TYPES: { id: OrderType; label: string }[] = [
  { id: "pickup", label: "Pickup" },
  { id: "delivery", label: "Delivery" },
  { id: "dinein", label: "Dine-in" },
];

const TIPS = [0, 10, 15, 20]; // percentages, default 0 — not standard to pre-tip here

const PAYMENT_METHODS: {
  id: PaymentMethod;
  label: string;
  description: string;
  Icon: typeof CreditCard;
}[] = [
  {
    id: "card",
    label: "Card",
    description: "Secure Paymob checkout",
    Icon: CreditCard,
  },
  {
    id: "cash",
    label: "Cash",
    description: "Pay on collection or delivery",
    Icon: Banknote,
  },
];

export function OrderPanel({
  cart,
  setQty,
  remove,
}: {
  cart: CartLine[];
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
}) {
  const submit = useServerFn(placeOrder);
  const sectionRef = useScrollReveal<HTMLElement>();
  const press = usePressFeedback();
  const [orderType, setOrderType] = useState<OrderType>("pickup");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [tipPct, setTipPct] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [branch, setBranch] = useState("");
  const [pending, setPending] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const confirmationRef = useEnterAnimation<HTMLParagraphElement>(
    confirmation !== null,
  );

  const subtotal = useMemo(
    () => cart.reduce((s, l) => s + l.unitPrice * l.qty, 0),
    [cart],
  );
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const delivery = orderType === "delivery" ? DELIVERY_FEE : 0;
  const tip = Math.round(subtotal * (tipPct / 100) * 100) / 100;
  const total = subtotal + tax + delivery + tip;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0) {
      toast.error("Your tray is empty. Add something fresh & طازة first.");
      return;
    }
    setPending(true);
    try {
      const res = await submit({
        data: {
          orderType,
          paymentMethod,
          guestName: name,
          phone,
          address,
          branch,
          items: cart,
          tip,
        },
      });
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      setConfirmation(res.orderId);
      toast.success("Order confirmed!", {
        description:
          paymentMethod === "cash" || res.payOnCollection
            ? `Total ${egp(res.total)}, pay on ${orderType === "delivery" ? "delivery" : "collection"}.`
            : `Total ${egp(res.total)}, opening secure card payment.`,
      });
      cart.forEach((l) => remove(l.id));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      id="order"
      ref={sectionRef}
      className="relative bg-[#232323] px-5 py-20 md:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <div data-reveal>
          <span className="label-mono text-[#29D9FF]">03 · Order Direct</span>
          <h2 className="mt-4 font-display text-4xl text-white sm:text-5xl">
            Your tray
          </h2>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          <div
            data-reveal
            className="pa-card rounded-2xl border border-[#C4C8CC]/25 bg-white/[0.03] p-6"
          >
            {cart.length === 0 ? (
              <p className="py-10 text-center text-sm text-white/50">
                Nothing here yet. Pick something from the menu above.
              </p>
            ) : (
              <ul className="space-y-4">
                {cart.map((line) => (
                  <CartRow
                    key={line.id}
                    line={line}
                    setQty={setQty}
                    remove={remove}
                  />
                ))}
              </ul>
            )}

            <div className="mt-6 space-y-2 border-t border-white/15 pt-5 font-mono text-sm [font-variant-numeric:tabular-nums]">
              <Row label="Subtotal" value={egp(subtotal)} />
              <Row
                label={`Tax (${Math.round(TAX_RATE * 100)}%)`}
                value={egp(tax)}
              />
              {orderType === "delivery" && (
                <Row label="Delivery" value={egp(delivery)} />
              )}
              {tip > 0 && <Row label="Tip" value={egp(tip)} />}
              <div className="flex justify-between border-t border-white/15 pt-3 font-display text-lg text-white">
                <span>Total</span>
                <span className="text-[#29D9FF]">{egp(total)}</span>
              </div>
            </div>
          </div>

          <form
            onSubmit={onSubmit}
            data-reveal
            className="pa-card rounded-2xl border border-[#C4C8CC]/25 bg-white/[0.03] p-6"
          >
            <div className="grid grid-cols-3 gap-2 rounded-full border border-white/15 bg-black/30 p-1">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  {...press}
                  onClick={() => setOrderType(t.id)}
                  className={`rounded-full py-2 text-sm font-medium transition-colors ${
                    orderType === t.id
                      ? "bg-[#F2597F] text-[#232323]"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="o-name" className="text-white/80">
                  Name
                </Label>
                <Input
                  id="o-name"
                  name="name"
                  required
                  minLength={2}
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Abdo K."
                  className="pa-input"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="o-phone" className="text-white/80">
                  Mobile
                </Label>
                <Input
                  id="o-phone"
                  name="phone"
                  type="tel"
                  required
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01x xxx xxxxx"
                  className="pa-input"
                />
              </div>
              {orderType === "delivery" ? (
                <div className="grid gap-1.5">
                  <Label htmlFor="o-address" className="text-white/80">
                    Delivery address
                  </Label>
                  <Textarea
                    id="o-address"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street, building, floor, Heliopolis"
                    className="pa-input"
                  />
                </div>
              ) : (
                <div className="grid gap-1.5">
                  <Label htmlFor="o-branch" className="text-white/80">
                    {orderType === "dinein" ? "You're coming to" : "Pickup at"}
                  </Label>
                  <Input
                    id="o-branch"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="96 Omar Ibn El-Khattab, Heliopolis"
                    className="pa-input"
                  />
                </div>
              )}

              <div>
                <Label className="mb-2 block text-white/80">
                  Tip (optional)
                </Label>
                <div className="flex flex-wrap gap-2">
                  {TIPS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      {...press}
                      onClick={() => setTipPct(t)}
                      className={`rounded-full border px-4 py-2.5 font-mono text-xs transition-colors ${
                        tipPct === t
                          ? "border-[#29D9FF] bg-[#29D9FF] text-[#232323]"
                          : "border-white/20 bg-black/20 text-white/70"
                      }`}
                    >
                      {t === 0 ? "No tip" : `${t}%`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-2 block text-white/80">
                  Payment method
                </Label>
                <div
                  className="grid gap-2 sm:grid-cols-2"
                  role="radiogroup"
                  aria-label="Payment method"
                >
                  {PAYMENT_METHODS.map(({ id, label, description, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      {...press}
                      onClick={() => setPaymentMethod(id)}
                      aria-pressed={paymentMethod === id}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                        paymentMethod === id
                          ? "border-[#29D9FF] bg-[#29D9FF]/15"
                          : "border-white/20 bg-black/20"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-white" />
                      <span>
                        <span className="block text-sm font-semibold text-white">
                          {label}
                        </span>
                        <span className="block text-xs text-white/60">
                          {description}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="pa-cta mt-6 w-full"
              disabled={pending}
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {paymentMethod === "card"
                ? "Continue to payment"
                : "Place order"}{" "}
              · {egp(total)}
            </Button>

            {/* Paymob (Egypt-native, EGP settlement) is used instead of Stripe —
                Stripe does not support Egyptian merchant accounts or EGP payouts. */}
            <p className="mt-3 text-center text-xs text-white/40">
              {paymentMethod === "card"
                ? "Card payments are processed in EGP by Paymob. If checkout is unavailable, payment falls back to collection."
                : "Cash orders are paid on delivery or at the counter."}
            </p>

            {confirmation && (
              <p
                ref={confirmationRef}
                className="mt-4 overflow-hidden rounded-xl bg-[#29D9FF]/15 p-3 text-center text-sm text-[#29D9FF]"
              >
                Order confirmed. Reference{" "}
                <span className="font-mono">{confirmation.slice(0, 8)}</span>
              </p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}

function CartRow({
  line,
  setQty,
  remove,
}: {
  line: CartLine;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
}) {
  const rowRef = useEnterAnimation<HTMLLIElement>();
  const press = usePressFeedback();
  const removing = useRef(false);

  function exit(action: () => void) {
    if (removing.current) return;
    removing.current = true;
    animateOut(rowRef.current, action);
  }

  return (
    <li ref={rowRef} className="flex items-center gap-3 overflow-hidden">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-white">
          {line.name}
          {line.size ? ` · ${line.size}` : ""}
        </p>
        <p className="font-mono text-xs text-white/50">{egp(line.unitPrice)}</p>
      </div>
      <div className="flex items-center gap-1 rounded-full border border-white/20">
        <button
          type="button"
          className="p-2 text-white/80"
          aria-label="Decrease quantity"
          {...press}
          onClick={() =>
            line.qty <= 1
              ? exit(() => setQty(line.id, 0))
              : setQty(line.id, line.qty - 1)
          }
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className="w-6 text-center font-mono text-sm text-white">
          {line.qty}
        </span>
        <button
          type="button"
          className="p-2 text-white/80"
          aria-label="Increase quantity"
          {...press}
          onClick={() => setQty(line.id, line.qty + 1)}
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
      <span className="w-24 text-right font-mono text-sm text-white [font-variant-numeric:tabular-nums]">
        {egp(line.unitPrice * line.qty)}
      </span>
      <button
        type="button"
        aria-label={`Remove ${line.name}`}
        {...press}
        onClick={() => exit(() => remove(line.id))}
        className="text-white/50 transition-colors hover:text-[#F2597F]"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-white/60">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
