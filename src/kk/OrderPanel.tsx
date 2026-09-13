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
import { egp, DELIVERY_FEE, TAX_RATE } from "../../lib/kk-menu";
import { placeOrder } from "../../lib/kk-koffee.functions";
import type { CartLine } from "../kk/cart";
import { useScrollReveal } from "../../lib/kk-hooks/use-scroll-reveal";
import { animateOut, useEnterAnimation, usePressFeedback } from "../../lib/kk-motion";

type OrderType = "pickup" | "delivery" | "dinein";
type PaymentMethod = "card" | "cash";
type PaymentOutcome = "approved" | "declined";
type Confirmation = {
  reference: string;
  paymentStatus: "paid" | "pay_on_collection";
};

const TYPES: { id: OrderType; label: string }[] = [
  { id: "pickup", label: "Pickup" },
  { id: "delivery", label: "Delivery" },
  { id: "dinein", label: "Dine-in" },
];

const TIPS = [0, 10, 15, 20];

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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [paymentOutcome, setPaymentOutcome] = useState<PaymentOutcome>("approved");
  const [tipPct, setTipPct] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [branch, setBranch] = useState("");
  const [pending, setPending] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const confirmationRef = useEnterAnimation<HTMLParagraphElement>(
    confirmation !== null,
  );

  const subtotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.unitPrice * line.qty, 0),
    [cart],
  );
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const delivery = orderType === "delivery" ? DELIVERY_FEE : 0;
  const tip = Math.round(subtotal * (tipPct / 100) * 100) / 100;
  const total = subtotal + tax + delivery + tip;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0) {
      toast.error("Your kart is empty — add a Koffee Kan first.");
      return;
    }

    setPending(true);
    setPaymentError(null);
    try {
      const res = await submit({
        data: {
          orderType,
          paymentMethod,
          paymentOutcome: paymentMethod === "card" ? paymentOutcome : undefined,
          guestName: name,
          phone,
          address,
          branch,
          items: cart,
          tip,
        },
      });

      if (res.paymentStatus === "declined") {
        const message =
          res.paymentMessage ??
          "The demo card was declined. Try again or choose cash.";
        setPaymentError(message);
        toast.error("Payment declined", { description: message });
        return;
      }

      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }

      setConfirmation({
        reference: res.orderId,
        paymentStatus: res.paymentStatus,
      });
      toast.success("Order konfirmed!", {
        description:
          res.paymentStatus === "paid"
            ? `Card payment approved · total ${egp(res.total)}.`
            : `Total ${egp(res.total)} — pay on ${
                orderType === "delivery" ? "delivery" : "kollection"
              }.`,
      });
      cart.forEach((line) => remove(line.id));
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
      className="mx-auto max-w-6xl px-5 py-16 md:py-24"
    >
      <div data-reveal>
        <span className="label-mono text-accent">03 — Order Direkt</span>
        <h2 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">
          Your kart
        </h2>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <div
          data-reveal
          className="kk-card rounded-2xl border border-border bg-card p-6"
        >
          {cart.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
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

          <div className="mt-6 space-y-2 border-t border-border pt-5 font-mono text-sm">
            <Row label="Subtotal" value={egp(subtotal)} />
            <Row
              label={`Tax (${Math.round(TAX_RATE * 100)}%)`}
              value={egp(tax)}
            />
            {orderType === "delivery" && (
              <Row label="Delivery" value={egp(delivery)} />
            )}
            {tip > 0 && <Row label="Tip" value={egp(tip)} />}
            <div className="flex justify-between border-t border-border pt-3 font-display text-lg font-extrabold">
              <span>Total</span>
              <span>{egp(total)}</span>
            </div>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          data-reveal
          className="kk-card rounded-2xl border border-border bg-secondary p-6"
        >
          <div className="grid grid-cols-3 gap-2 rounded-full bg-background p-1">
            {TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                {...press}
                onClick={() => setOrderType(type.id)}
                className={`kk-button rounded-full py-2 text-sm font-medium transition-colors ${
                  orderType === type.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="o-name">Name</Label>
              <Input
                id="o-name"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Amina A."
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="o-phone">Mobile</Label>
              <Input
                id="o-phone"
                required
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
              />
            </div>
            {orderType === "delivery" ? (
              <div className="grid gap-1.5">
                <Label htmlFor="o-address">Delivery address</Label>
                <Textarea
                  id="o-address"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, building, floor — Sheikh Zayed"
                />
              </div>
            ) : (
              <div className="grid gap-1.5">
                <Label htmlFor="o-branch">Branch</Label>
                <Input
                  id="o-branch"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="Arkan Plaza"
                />
              </div>
            )}

            <div>
              <Label className="mb-2 block">Tip (optional)</Label>
              <div className="flex flex-wrap gap-2">
                {TIPS.map((tipOption) => (
                  <button
                    key={tipOption}
                    type="button"
                    {...press}
                    onClick={() => setTipPct(tipOption)}
                    className={`kk-button rounded-full border border-border px-4 py-1.5 font-mono text-xs transition-colors ${
                      tipPct === tipOption
                        ? "bg-accent text-accent-foreground"
                        : "bg-background"
                    }`}
                  >
                    {tipOption === 0 ? "No tip" : `${tipOption}%`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Payment method</Label>
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
                    onClick={() => {
                      setPaymentMethod(id);
                      setPaymentError(null);
                    }}
                    aria-pressed={paymentMethod === id}
                    className={`kk-button flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                      paymentMethod === id
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border bg-background"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>
                      <span className="block text-sm font-semibold">{label}</span>
                      <span className="block text-xs opacity-75">{description}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === "card" && (
              <div className="rounded-xl border border-border bg-background/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-xs">Offline card simulator</Label>
                  <span className="label-mono text-muted-foreground">Demo only</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Choose an outcome to preview the payment flow without a gateway.
                </p>
                <div
                  className="mt-3 grid grid-cols-2 gap-2"
                  role="group"
                  aria-label="Simulated card payment outcome"
                >
                  {(["approved", "declined"] as PaymentOutcome[]).map((outcome) => (
                    <button
                      key={outcome}
                      type="button"
                      {...press}
                      onClick={() => {
                        setPaymentOutcome(outcome);
                        setPaymentError(null);
                      }}
                      className={`kk-button rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                        paymentOutcome === outcome
                          ? outcome === "approved"
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-destructive bg-destructive text-destructive-foreground"
                          : "border-border bg-background"
                      }`}
                    >
                      {outcome === "approved" ? "Approve payment" : "Decline payment"}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {paymentOutcome === "approved"
                    ? "The demo will show a paid order and clear the kart."
                    : "The kart stays intact so you can retry or switch to cash."}
                </p>
              </div>
            )}

            {paymentError && (
              <p
                role="alert"
                className="rounded-xl bg-destructive/20 p-3 text-center text-sm text-destructive"
              >
                {paymentError}
              </p>
            )}
          </div>

          <Button type="submit" size="lg" className="mt-6 w-full" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {paymentMethod === "card"
              ? paymentOutcome === "declined"
                ? "Simulate declined payment"
                : "Simulate card payment"
              : "Place order"}{" "}
            · {egp(total)}
          </Button>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            {paymentMethod === "card"
              ? "Card payments are simulated locally in this offline demo. No real charge is made."
              : "Cash orders are paid on delivery or at kollection."}
          </p>

          {confirmation && (
            <p
              ref={confirmationRef}
              className="mt-4 overflow-hidden rounded-xl bg-primary/30 p-3 text-center text-sm"
            >
              Order konfirmed. Reference{" "}
              <span className="font-mono">{confirmation.reference}</span>
              <span className="mt-1 block text-xs opacity-75">
                {confirmation.paymentStatus === "paid"
                  ? "Card payment approved · paid offline in demo mode."
                  : `Pay on ${orderType === "delivery" ? "delivery" : "kollection"}.`}
              </span>
            </p>
          )}
        </form>
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
        <p className="truncate font-medium">
          {line.name}
          {line.size ? ` · ${line.size}` : ""}
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          {egp(line.unitPrice)}
        </p>
      </div>
      <div className="flex items-center gap-1 rounded-full border border-border">
        <button
          type="button"
          className="p-2"
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
        <span className="w-6 text-center font-mono text-sm">{line.qty}</span>
        <button
          type="button"
          className="p-2"
          aria-label="Increase quantity"
          {...press}
          onClick={() => setQty(line.id, line.qty + 1)}
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
      <span className="w-24 text-right font-mono text-sm">
        {egp(line.unitPrice * line.qty)}
      </span>
      <button
        type="button"
        aria-label={`Remove ${line.name}`}
        {...press}
        onClick={() => exit(() => remove(line.id))}
        className="text-muted-foreground transition-colors hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
