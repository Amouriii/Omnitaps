// In-Process Domain Event Bus
// ==========================
// Replaces webhook/HTTP calls between modules with strongly typed in-process events.
// All events are emitted via the EventEmitter2 instance below and subscribed to by
// relevant modules. See the architecture guide for the full event contract.

// Event topics (matching the architecture guide specification):
//   menu.stock_updated      - emitter: menu   -> subscriber: web-menu WS, waiter-ai
//   order.paid              - emitter: orders -> subscriber: loyalty, qr-onboarding
//   loyalty.updated         - emitter: loyalty -> subscriber: wallet (APNs/REST/Samsung)
//   table.qr_scanned        - emitter: qr-onboarding -> subscriber: reservations

// Event payload interfaces (TypeScript):
//   MenuStockUpdate = { storeId, menuItemId, isAvailable, stockCount }
//   OrderPaidPayload = { orderId, customerId, tableSessionId, subtotalCents }
//   LoyaltyUpdatedPayload = { customerId, pointsBalance, tierName, newlyUnlockedMilestones[] }
//   TableQrScannedPayload = { tableId, tableSessionId, timestamp }

// Simple in-process event emitter (no external dependencies)
const eventListeners: Map<string, ((payload: any) => void)[]> = new Map();

function emitToTopic(topic: string, payload: any) {
  const listeners = eventListeners.get(topic) || [];
  listeners.forEach((listener) => listener(payload));
}

function addListener(topic: string, listener: (payload: any) => void) {
  const listeners = eventListeners.get(topic) || [];
  listeners.push(listener);
  eventListeners.set(topic, listeners);
}

function removeListener(topic: string, listener: (payload: any) => void) {
  const listeners = eventListeners.get(topic) || [];
  const index = listeners.indexOf(listener);
  if (index !== -1) listeners.splice(index, 1);
}

// ============================================================
// Emit typed domain events (call from any module)
// ============================================================

/** Emitted when menu stock status changes */
export function emitMenuStockUpdated(
  storeId: string,
  menuItemId: string,
  isAvailable: boolean,
  stockCount: number | null
) {
  emitToTopic("menu.stock_updated", { storeId, menuItemId, isAvailable, stockCount });
}

/** Emitted when an order is paid */
export function emitOrderPaid({
  orderId,
  customerId,
  tableSessionId,
  subtotalCents,
}: {
  orderId: string;
  customerId: string;
  tableSessionId: string | undefined;
  subtotalCents: number;
}) {
  emitToTopic("order.paid", { orderId, customerId, tableSessionId, subtotalCents });
}

/** Emitted when loyalty state changes */
export function emitLoyaltyUpdated({
  customerId,
  pointsBalance,
  tierName,
  newlyUnlockedMilestones,
}: {
  customerId: string;
  pointsBalance: number;
  tierName: string;
  newlyUnlockedMilestones: string[];
}) {
  emitToTopic("loyalty.updated", { customerId, pointsBalance, tierName, newlyUnlockedMilestones });
}

/** Emitted when a table QR code is scanned */
export function emitTableQrScanned({
  tableId,
  tableSessionId,
  timestamp,
}: {
  tableId: string;
  tableSessionId: string;
  timestamp: number;
}) {
  emitToTopic("table.qr_scanned", { tableId, tableSessionId, timestamp });
}

// ============================================================
// Subscribe to events (register in module init)
// ============================================================

/** Subscribe to menu stock update events */
export function subscribeMenuStockUpdated(
  callback: (payload: {
    storeId: string;
    menuItemId: string;
    isAvailable: boolean;
    stockCount: number | null;
  }) => void
) {
  addListener("menu.stock_updated", callback);
  return () => removeListener("menu.stock_updated", callback);
}

/** Subscribe to order paid events */
export function subscribeOrderPaid(
  callback: (payload: {
    orderId: string;
    customerId: string;
    tableSessionId: string | undefined;
    subtotalCents: number;
  }) => void
) {
  addListener("order.paid", callback);
  return () => removeListener("order.paid", callback);
}

/** Subscribe to loyalty updated events */
export function subscribeLoyaltyUpdated(
  callback: (payload: {
    customerId: string;
    pointsBalance: number;
    tierName: string;
    newlyUnlockedMilestones: string[];
  }) => void
) {
  addListener("loyalty.updated", callback);
  return () => removeListener("loyalty.updated", callback);
}

/** Subscribe to table QR scanned events */
export function subscribeTableQrScanned(
  callback: (payload: {
    tableId: string;
    tableSessionId: string;
    timestamp: number;
  }) => void
) {
  addListener("table.qr_scanned", callback);
  return () => removeListener("table.qr_scanned", callback);
}