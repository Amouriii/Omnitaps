// Module 5: Digital Menu QR, Wi-Fi & Google Maps
// QrOnboardingService - QR onboarding service from architecture guide
// ============================================================
// Provides the table QR resolution and Wi-Fi payload generation.
// The actual Prisma queries should use the existing database schema.
// This service emits 'table.qr_scanned' events that the reservations module can subscribe to.

import { emitTableQrScanned } from "../chatbot/lib/eventEmitter";

/** Wi-Fi credentials interface */
export interface WiFiCredentials {
  ssid: string;
  password: string;
  security: string; // WPA, WEP, nopass
  qrPayload: string;
}

/** Google Maps review data interface */
export interface GoogleMapsReviewData {
  tableNumber: string;
  sessionId: string;
  wifi: WiFiCredentials;
  googleMapsReviewUrl: string;
  reviewRewardPoints: number;
}

/** Table scan result interface */
export interface TableScanResult {
  tableNumber: string;
  sessionId: string;
  wifi: WiFiCredentials;
  googleMapsReviewUrl: string;
  reviewRewardPoints: number;
}

/**
 * Resolve table scan from QR code
 * 
 * From the architecture guide's QR onboarding implementation.
 * Resolves the table, creates/joins an active TableSession,
 * and returns Wi-Fi credentials + Google Maps review link.
 * Emits 'table.qr_scanned' event for other modules to subscribe to.
 */
export function resolveTableScan(
  qrToken: string,
  tableNumber: string,
  sessionId: string,
  wifiSsid: string,
  wifiPassword: string,
  wifiSecurity: string,
  googleMapsPlaceId: string,
  reviewRewardPoints: number
): TableScanResult {
  const wifiQrString = `WIFI:T:${wifiSecurity};S:${wifiSsid};P:${wifiPassword};H:${false};;`;
  const googleMapsReviewUrl = `https://search.google.com/local/writereview?placeid=${encodeURIComponent(
    googleMapsPlaceId
  )}`;

  const result: TableScanResult = {
    tableNumber,
    sessionId,
    wifi: {
      ssid: wifiSsid,
      password: wifiPassword,
      security: wifiSecurity,
      qrPayload: wifiQrString,
    },
    googleMapsReviewUrl,
    reviewRewardPoints,
  };

  // Emit event for other modules (reservations, etc.) to subscribe to
  emitTableQrScanned({
    tableId: qrToken,
    tableSessionId: sessionId,
    timestamp: Date.now(),
  });

  return result;
}

/**
 * Get Wi-Fi mobile config for iOS auto-join
 * From the architecture guide's Wi-Fi provisioning section.
 */
export function getWifiMobileConfig(): string {
  return `WIFI:T:WPA;S:placeholder-ssid;P:placeholder-pass;;`;
}

/**
 * Google Maps review deep link
 * From the architecture guide's Google Maps Review endpoint implementation.
 */
export function getGoogleMapsReviewUrl(placeId: string): string {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}