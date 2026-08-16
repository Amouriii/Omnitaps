import type { SupabaseClient } from "@supabase/supabase-js";
import type { Enterprise } from "../../db/schema/wifi.js";
import { NoopNetworkAdapter } from "./adapters/MockNetworkAdapter.js";
import { RadiusNetworkAdapter, radiusContextFromEnterprise } from "./adapters/RadiusNetworkAdapter.js";
import { captiveQuotaEvents, ensureDefaultQuotaSubscriber } from "./captiveQuota.js";
import { HttpOtpDelivery } from "./delivery/HttpOtpDelivery.js";
import { NoopOtpDelivery } from "./delivery/OtpDelivery.js";
import {
  IdentityVerificationService,
  shouldEchoCaptiveOtp,
} from "./IdentityVerificationService.js";
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
      delivery: shouldEchoCaptiveOtp()
        ? // Demo mode: the code is returned in the /otp start response, so no
          // provider send is attempted (this also lets the flow run end-to-end
          // in production without RESEND_*/TWILIO_* credentials).
          new NoopOtpDelivery()
        : new HttpOtpDelivery({
            // Local/demo only: log the code when a provider channel is unconfigured.
            // Production never logs plaintext codes.
            allowConsoleFallback: process.env.NODE_ENV !== "production",
          }),
    }),
    radius,
  });
}
