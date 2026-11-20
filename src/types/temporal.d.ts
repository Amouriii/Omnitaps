// The Temporal polyfill is loaded lazily at runtime (see
// components/wifi/portal/SubscriptionTierCard.tsx). Declare the global so the
// guarded `typeof Temporal` / `Temporal.Duration` access type-checks.
declare global {
  // eslint-disable-next-line no-var
  var Temporal: typeof import("temporal-polyfill").Temporal;
}

export {};
