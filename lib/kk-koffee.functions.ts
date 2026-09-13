import { z } from "zod";
import { createDemoReference } from "./kk-demo-utils";

// Demo stubs — in the real Koffee Kulture project these are TanStack Start
// server functions that hit Supabase + Paymob. Here we simulate the complete
// checkout lifecycle locally so the original UI can be explored without a backend.

const TAX_RATE = 0.14;
const DELIVERY_FEE = 35;
const round2 = (n: number) => Math.round(n * 100) / 100;
const egyptianMobile = /^(\+?20)?0?1[0-2,5]\d{8}$/;
const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

const orderSchema = z.object({
  orderType: z.enum(["pickup", "delivery", "dinein"]),
  paymentMethod: z.enum(["card", "cash"]),
  paymentOutcome: z.enum(["approved", "declined"]).optional(),
  guestName: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(egyptianMobile, "Enter a valid Egyptian mobile number"),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  branch: z.string().trim().max(120).optional().or(z.literal("")),
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      size: z.string().optional(),
      unitPrice: z.number().nonnegative(),
      qty: z.number().int().min(1).max(50),
    }),
  ).min(1),
  tip: z.number().min(0).max(5000).default(0),
});

export const placeOrder = async function placeOrder(data: unknown) {
  const parsed = orderSchema.parse(data);
  const subtotal = round2(
    parsed.items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0),
  );
  const tax = round2(subtotal * TAX_RATE);
  const deliveryFee = parsed.orderType === "delivery" ? DELIVERY_FEE : 0;
  const tip = round2(parsed.tip ?? 0);
  const total = round2(subtotal + tax + deliveryFee + tip);
  const orderId = createDemoReference("KK");

  // Let the offline checkout feel like a real processor round trip while
  // remaining deterministic and entirely local to this browser session.
  await wait(450);

  if (parsed.orderType === "delivery" && !parsed.address) {
    throw new Error("A delivery address is required for delivery orders.");
  }

  if (parsed.paymentMethod === "card" && parsed.paymentOutcome === "declined") {
    return {
      orderId,
      subtotal,
      tax,
      deliveryFee,
      tip,
      total,
      checkoutUrl: null,
      payOnCollection: false,
      paymentMethod: parsed.paymentMethod,
      paymentStatus: "declined" as const,
      paymentMessage: "The demo card was declined. Try again or choose cash.",
    };
  }

  return {
    orderId,
    subtotal,
    tax,
    deliveryFee,
    tip,
    total,
    checkoutUrl: null,
    payOnCollection: parsed.paymentMethod === "cash",
    paymentMethod: parsed.paymentMethod,
    paymentStatus: parsed.paymentMethod === "card" ? ("paid" as const) : ("pay_on_collection" as const),
    paymentMessage: null,
  };
};

const reservationSchema = z.object({
  guestName: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(egyptianMobile, "Enter a valid Egyptian mobile number"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  partySize: z.number().int().min(1).max(30),
  branch: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(400).optional().or(z.literal("")),
});

export const createReservation = async function createReservation(data: unknown) {
  reservationSchema.parse(data);
  await wait(350);
  return { reservationId: createDemoReference("RES") };
};
