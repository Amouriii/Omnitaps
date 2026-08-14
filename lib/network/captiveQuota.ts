import { NoopNetworkAdapter } from "./adapters/MockNetworkAdapter.js";
import { RadiusNetworkAdapter } from "./adapters/RadiusNetworkAdapter.js";
import { QuotaEventEmitter } from "./QuotaEventEmitter.js";
import { QUOTA_EVENTS, type QuotaExceededPayload } from "./types.js";

/** Process-wide emitter for captive Path A (session-status / OTP). */
export const captiveQuotaEvents = new QuotaEventEmitter();

let defaultSubscriberWired = false;

function defaultRevokeSubscriber(payload: QuotaExceededPayload): void {
  const adapter = payload.radius
    ? new RadiusNetworkAdapter(payload.radius, { nonBlocking: true })
    : new NoopNetworkAdapter();
  void adapter
    .revokeAccess({ session: payload.session, reason: "quota_exceeded" })
    .catch((error) => {
      console.warn(
        "[network] default revokeAccess failed:",
        error instanceof Error ? error.message : String(error),
      );
    });
}

export function ensureDefaultQuotaSubscriber(): QuotaEventEmitter {
  if (!defaultSubscriberWired) {
    defaultSubscriberWired = true;
    captiveQuotaEvents.on(QUOTA_EVENTS.ON_QUOTA_EXCEEDED, defaultRevokeSubscriber);
  }
  return captiveQuotaEvents;
}
