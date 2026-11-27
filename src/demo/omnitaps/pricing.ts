import { ADD_ONS } from "./constants";
import type { AddOn, ServiceOffering } from "./types";

export interface PriceLine {
  id: string;
  label: string;
  detail: string;
  amountCents: number;
}

export interface BookingPrice {
  baseCents: number;
  addOnsCents: number;
  totalCents: number;
  perGuestCents: number;
  lines: PriceLine[];
}

export function serviceBaseCents(service: ServiceOffering, partySize: number): number {
  return service.priceUnit === "guest"
    ? service.priceCents * partySize
    : service.priceCents;
}

export function addOnCents(addOn: AddOn, partySize: number): number {
  return addOn.unit === "guest" ? addOn.priceCents * partySize : addOn.priceCents;
}

export function calculateBookingPrice(
  service: ServiceOffering,
  partySize: number,
  addOnIds: string[],
): BookingPrice {
  const lines: PriceLine[] = [];
  const baseCents = serviceBaseCents(service, partySize);

  lines.push({
    id: service.id,
    label: service.name,
    detail: `${partySize} ${partySize === 1 ? "guest" : "guests"} · ${service.priceUnit === "guest" ? "per guest" : "per table"}`,
    amountCents: baseCents,
  });

  let addOnsCents = 0;
  for (const id of addOnIds) {
    const addOn = ADD_ONS.find((entry) => entry.id === id);
    if (!addOn) continue;
    const amount = addOnCents(addOn, partySize);
    addOnsCents += amount;
    lines.push({
      id: addOn.id,
      label: addOn.name,
      detail: addOn.priceCents === 0 ? "Included" : addOn.unit === "guest" ? "Per guest" : "Per booking",
      amountCents: amount,
    });
  }

  const totalCents = baseCents + addOnsCents;
  return {
    baseCents,
    addOnsCents,
    totalCents,
    perGuestCents: Math.round(totalCents / Math.max(partySize, 1)),
    lines,
  };
}
