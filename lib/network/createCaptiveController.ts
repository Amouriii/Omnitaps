import type { SupabaseClient } from "@supabase/supabase-js";
import type { Enterprise } from "../../db/schema/wifi.js";
import { NoopNetworkAdapter } from "./adapters/MockNetworkAdapter.js";
import { RadiusNetworkAdapter, radiusContextFromEnterprise } from "./adapters/RadiusNetworkAdapter.js";
import { captiveQuotaEvents, ensureDefaultQuotaSubscriber } from "./captiveQuota.js";
import { NoopOtpDelivery } from "./delivery/OtpDelivery.js";
import { IdentityVerificationService } from "./IdentityVerificationService.js";
import { NetworkSessionController } from "./NetworkSessionController.js";
import { SupabaseNetworkStore } from "./stores/SupabaseNetworkStore.js";

export function createCaptiveController(
  supabase: SupabaseClient,
  enterprise: Enterprise,
): NetworkSessionController {
  ensureDefaultQuotaSubscriber();
  const store = new SupabaseNetworkStore(supabase);
  const radius = radiusContextFromEnterprise(enterprise);
  const adapter = radius
    ? new RadiusNetworkAdapter(radius, { nonBlocking: true })
    : new NoopNetworkAdapter();

  return new NetworkSessionController({
    store,
    adapter,
    events: captiveQuotaEvents,
    identity: new IdentityVerificationService({
      store,
      delivery: new NoopOtpDelivery(),
    }),
    radius,
  });
}
