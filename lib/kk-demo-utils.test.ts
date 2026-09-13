import { describe, expect, it } from "vitest";
import { createDemoReference } from "./kk-demo-utils";
import { placeOrder } from "./kk-koffee.functions";

describe("Koffee Kulture offline demo", () => {
  it("creates readable order and reservation references", () => {
    const date = new Date("2026-09-13T10:30:00.000Z");

    expect(createDemoReference("KK", date, 0.123456)).toMatch(/^KK-20260913-[A-Z2-9]{4}$/);
    expect(createDemoReference("RES", date, 0.654321)).toMatch(/^RES-20260913-[A-Z2-9]{4}$/);
  });

  it("returns an approved paid card order with totals", async () => {
    const result = await placeOrder({
      orderType: "pickup",
      paymentMethod: "card",
      paymentOutcome: "approved",
      guestName: "Amina Akef",
      phone: "01012345678",
      branch: "Arkan Plaza",
      items: [{ id: "latte", name: "Latte", unitPrice: 90, qty: 2 }],
      tip: 10,
    });

    expect(result.orderId).toMatch(/^KK-\d{8}-[A-Z2-9]{4}$/);
    expect(result.subtotal).toBe(180);
    expect(result.tax).toBe(25.2);
    expect(result.total).toBe(215.2);
    expect(result.paymentStatus).toBe("paid");
    expect(result.payOnCollection).toBe(false);
  });

  it("keeps the kart recoverable when the simulated card is declined", async () => {
    const result = await placeOrder({
      orderType: "pickup",
      paymentMethod: "card",
      paymentOutcome: "declined",
      guestName: "Amina Akef",
      phone: "01012345678",
      items: [{ id: "espresso", name: "Espresso", unitPrice: 50, qty: 1 }],
      tip: 0,
    });

    expect(result.paymentStatus).toBe("declined");
    expect(result.paymentMessage).toContain("declined");
    expect(result.payOnCollection).toBe(false);
  });

  it("uses pay-on-collection for cash orders and requires delivery addresses", async () => {
    const cash = await placeOrder({
      orderType: "delivery",
      paymentMethod: "cash",
      guestName: "Amina Akef",
      phone: "01012345678",
      address: "Sheikh Zayed",
      items: [{ id: "latte", name: "Latte", unitPrice: 90, qty: 1 }],
      tip: 0,
    });

    expect(cash.paymentStatus).toBe("pay_on_collection");
    expect(cash.payOnCollection).toBe(true);
    await expect(
      placeOrder({
        orderType: "delivery",
        paymentMethod: "cash",
        guestName: "Amina Akef",
        phone: "01012345678",
        items: [{ id: "latte", name: "Latte", unitPrice: 90, qty: 1 }],
        tip: 0,
      }),
    ).rejects.toThrow("delivery address");
  });
});
