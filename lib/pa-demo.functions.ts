import { z } from "zod";

const egyptianMobile = /^(\+?20)?0?1[0-2,5]\d{8}$/;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const itemSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.string().optional(),
  unitPrice: z.number().nonnegative(),
  qty: z.number().int().min(1).max(50),
});

const orderSchema = z.object({
  orderType: z.enum(["pickup", "delivery", "dinein"]),
  paymentMethod: z.enum(["card", "cash"]),
  paymentOutcome: z.enum(["approved", "declined"]).optional(),
  guestName: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(egyptianMobile, "Enter a valid Egyptian mobile number"),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  branch: z.string().trim().max(120).optional().or(z.literal("")),
  items: z.array(itemSchema).min(1),
  tip: z.number().min(0).max(5000).default(0),
});

const reservationSchema = z.object({
  guestName: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(egyptianMobile, "Enter a valid Egyptian mobile number"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  partySize: z.number().int().min(1).max(30),
  branch: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(400).optional().or(z.literal("")),
});

const round2 = (value: number) => Math.round(value * 100) / 100;
const reference = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

export const placeOrder = async function placeOrder(data: unknown) {
  const parsed = orderSchema.parse(data);
  const subtotal = round2(parsed.items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0));
  const tax = round2(subtotal * 0.14);
  const deliveryFee = parsed.orderType === "delivery" ? 35 : 0;
  const tip = round2(parsed.tip ?? 0);
  const total = round2(subtotal + tax + deliveryFee + tip);

  if (parsed.orderType === "delivery" && !parsed.address) {
    throw new Error("A delivery address is required for delivery orders.");
  }

  await wait(450);
  if (parsed.paymentMethod === "card" && parsed.paymentOutcome === "declined") {
    return {
      orderId: reference("PA"), subtotal, tax, deliveryFee, tip, total,
      checkoutUrl: null, payOnCollection: false, paymentMethod: parsed.paymentMethod,
      paymentStatus: "declined" as const,
      paymentMessage: "The demo card was declined. Try again or choose cash.",
    };
  }

  return {
    orderId: reference("PA"), subtotal, tax, deliveryFee, tip, total,
    checkoutUrl: null,
    payOnCollection: parsed.paymentMethod === "cash",
    paymentMethod: parsed.paymentMethod,
    paymentStatus: parsed.paymentMethod === "card" ? "paid" as const : "pay_on_collection" as const,
    paymentMessage: null,
  };
};

export const createReservation = async function createReservation(data: unknown) {
  const parsed = reservationSchema.parse(data);
  await wait(350);
  return {
    reservationId: reference("RES"),
    ownerNotified: false,
    details: parsed,
  };
};
