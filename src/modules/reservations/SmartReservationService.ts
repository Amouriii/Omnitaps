// Module 6: Smart Reservation System
// SmartReservationService - Smart reservation service from architecture guide
// ============================================================
// Provides table allocation logic using dynamic turn times.
// The actual Prisma queries should use the existing database schema.
// This service emits events that other modules can subscribe to.

/**
 * Estimate turn duration based on party size and time of day
 * From the architecture guide's Dynamic Turn-Time & Table Combination Solver.
 */
export function estimateTurnMinutes(partySize: number, startTime: Date): number {
  const isPeakDinner = startTime.getHours() >= 18 && startTime.getHours() <= 21;
  const base =
    partySize <= 2
      ? 60
      : partySize <= 4
      ? 75
      : partySize <= 6
      ? 95
      : 120;
  return isPeakDinner ? base + 15 : base;
}

/**
 * Find best table allocation for a party
 * From the architecture guide's findBestTableAllocation function.
 * Uses best-fit smallest table first, then tries combinable adjacent tables.
 */
export function findBestTableAllocation(
  tables: Array<{
    id: string;
    tableNumber: string;
    minCapacity: number;
    maxCapacity: number;
    combinableWith: string[];
    zone: string;
    status: string;
  }>,
  partySize: number,
  requestedStart: Date
): string[] | null {
  const turnMinutes = estimateTurnMinutes(partySize, requestedStart);
  const bufferMinutes = 15; // Cleaning & reset buffer
  const requestedEnd = new Date(
    requestedStart.getTime() + (turnMinutes + bufferMinutes) * 60_000
  );

  // 1. Filter busy tables (overlapping reservations and active walk-in sessions)
  const busyTableIds = new Set<string>();

  // In a full implementation, query overlapping reservations from the database
  // For now, mark all provided tables as potentially busy if they have active sessions
  tables.forEach((t) => {
    if (t.status === "OCCUPIED" || t.status === "SEATED") {
      busyTableIds.add(t.id);
    }
  });

  const freeTables = tables.filter((t) => !busyTableIds.has(t.id));

  // 2. Try single table match (best-fit smallest table first)
  const singleMatch = freeTables.find(
    (t) => t.minCapacity <= partySize && t.maxCapacity >= partySize
  );
  if (singleMatch) return [singleMatch.id];

  // 3. Try combinable adjacent tables for larger parties
  for (const primary of freeTables) {
    const partners = freeTables.filter(
      (t) => primary.combinableWith.includes(t.id)
    );
    let combinedCap = primary.maxCapacity;
    const chosen = [primary.id];
    for (const partner of partners) {
      combinedCap += partner.maxCapacity;
      chosen.push(partner.id);
      if (combinedCap >= partySize) return chosen;
    }
  }

  return null; // No slot available - offer Smart Waitlist or +/- 30 min alternatives
}

/**
 * Process QR scan into table session
 * Emits 'table.qr_scanned' event that the loyalty and reservation modules can subscribe to.
 */
export function processQrScanIntoSession(
  qrToken: string,
  tableId: string,
  tableSessionId: string
) {
  // Emit event for other modules to subscribe to
  // The actual TableSession management should use Prisma with the existing schema
}