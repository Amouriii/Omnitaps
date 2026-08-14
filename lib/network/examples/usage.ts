/**
 * In-memory demo: phone OTP → session → quota breach → revokeAccess.
 *
 *   npx tsx lib/network/examples/usage.ts
 *   npm run demo:network
 */

import {
  ConsoleOtpDelivery,
  IdentityVerificationService,
  InMemorySessionStore,
  MockNetworkAdapter,
  NetworkSessionController,
  NetworkStatus,
  QUOTA_EVENTS,
  QuotaEventEmitter,
} from "../index.js";

async function main(): Promise<void> {
  const store = new InMemorySessionStore();
  const adapter = new MockNetworkAdapter();
  const events = new QuotaEventEmitter();

  events.on(QUOTA_EVENTS.ON_QUOTA_EXCEEDED, (payload) => {
    console.log("event ON_QUOTA_EXCEEDED", {
      sessionId: payload.session.id,
      usedBytes: payload.usedBytes,
      remainingBytes: payload.remainingBytes,
      status: payload.session.status,
    });
  });

  const identity = new IdentityVerificationService({
    store,
    delivery: new ConsoleOtpDelivery(),
  });
  const controller = new NetworkSessionController({
    store,
    adapter,
    events,
    identity,
  });

  const onboarded = await controller.onboard({
    enterpriseId: "demo-enterprise",
    macAddress: "aa:bb:cc:dd:ee:ff",
    apId: "ap-demo-1",
  });
  console.log("onboard", onboarded.device.id, onboarded.status);

  const issued = await controller.issueVerification({
    enterpriseId: onboarded.device.enterpriseId,
    deviceId: onboarded.device.id,
    identity: { kind: "phone", value: "+15555550100" },
    echoCode: true,
  });
  console.log("otp issued", { challengeId: issued.challengeId, code: issued.code });

  const session = await controller.verifyAndProvision({
    deviceId: onboarded.device.id,
    code: issued.code ?? "",
    limits: { maxBytes: 100, maxDurationSeconds: 3600 },
    downloadKbps: 5000,
    uploadKbps: 2000,
    apId: "ap-demo-1",
  });
  console.log("connected", {
    id: session.id,
    status: session.status,
    quotaBytes: session.quotaBytes,
  });

  const after = await controller.recordUsage({
    sessionId: session.id,
    bytesUp: 40,
    bytesDown: 80,
  });
  console.log("after usage", {
    status: after.status,
    bytesUp: after.bytesUp,
    bytesDown: after.bytesDown,
    expected: NetworkStatus.QUOTA_EXCEEDED,
  });

  console.log("adapter revokes", adapter.revokes.length);
  if (after.status !== NetworkStatus.QUOTA_EXCEEDED || adapter.revokes.length < 1) {
    throw new Error("Demo expected QUOTA_EXCEEDED and at least one revokeAccess");
  }
  console.log("demo:network ok");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
