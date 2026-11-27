/**
 * Shared domain contract for the Omnitaps reservations demo.
 *
 * Mirrors the repository's Phase 7 reservations plan
 * (docs/UNIFIED_HOSPITALITY_IMPLEMENTATION_PLAN.md, migration 014) and the
 * restaurant_tables contract from Phase 2. The demo keeps the same field
 * names so this store could be swapped for the Supabase API without changing
 * the UI.
 */

export type ZoneId = "dining_room" | "terrace" | "window_bar" | "private_salon";

export type TableStatus = "available" | "occupied" | "reserved" | "maintenance";

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "seated"
  | "completed"
  | "cancelled"
  | "no_show"
  | "waitlisted";

export type WaitlistStatus = "waiting" | "promoted" | "cancelled" | "expired";

export type CustomerTier = "Guest" | "Brass" | "Gold";

export type ReservationSource = "web" | "phone" | "walk_in" | "concierge";

export type DemoActor = "customer" | "staff" | "system";

export type NotificationKind =
  | "booking"
  | "status"
  | "waitlist"
  | "reminder"
  | "message"
  | "insight";

export interface EnterpriseInfo {
  id: string;
  name: string;
  slug: string;
  address: string;
  currency: "USD";
  timezone: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  tier: CustomerTier;
  visits: number;
  vip: boolean;
  notes: string;
  memberSince: string;
}

export interface ServiceOffering {
  id: string;
  name: string;
  tagline: string;
  description: string;
  durationMinutes: number;
  priceCents: number;
  priceUnit: "guest" | "table";
  zone: ZoneId;
  openTime: string;
  closeTime: string;
  slotMinutes: number;
  minPartySize: number;
  maxPartySize: number;
  highlights: string[];
  addOnIds: string[];
  accent: string;
  badge?: string;
}

export interface AddOn {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  unit: "booking" | "guest";
}

export interface RestaurantTable {
  id: string;
  enterpriseId: string;
  tableNumber: string;
  label: string;
  zone: ZoneId;
  minCapacity: number;
  maxCapacity: number;
  combinableWith: string[];
  status: TableStatus;
  isActive: boolean;
  shape: "round" | "square" | "booth";
}

export interface Reservation {
  id: string;
  reference: string;
  enterpriseId: string;
  customerId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  serviceId: string;
  tableIds: string[];
  partySize: number;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  zone: ZoneId | null;
  addOnIds: string[];
  specialRequests: string;
  vip: boolean;
  source: ReservationSource;
  totalCents: number;
  createdAt: string;
  updatedAt: string;
  reminderSentAt: string | null;
  waitlistEntryId?: string;
  internalNote?: string;
}

export interface WaitlistEntry {
  id: string;
  reference: string;
  enterpriseId: string;
  customerId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  serviceId: string;
  partySize: number;
  desiredDate: string;
  desiredFrom: string;
  desiredTo: string;
  preferredZone: ZoneId | null;
  specialRequests: string;
  vip: boolean;
  status: WaitlistStatus;
  joinedAt: string;
  reservationId: string;
  promotedAt?: string;
}

export interface DemoNotification {
  id: string;
  audience: "customer" | "enterprise";
  customerId?: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  reservationId?: string;
}

export interface ActivityEntry {
  id: string;
  at: string;
  actor: DemoActor;
  actorName: string;
  message: string;
  reservationId?: string;
}

export interface DemoSettings {
  bufferMinutes: number;
  autoPromoteWaitlist: boolean;
  acceptWaitlist: boolean;
  leadMinutes: number;
}

export interface DemoState {
  schemaVersion: 1;
  revision: number;
  updatedAt: string;
  seedAnchor: string;
  demoNow: string;
  enterprise: EnterpriseInfo;
  customers: Customer[];
  services: ServiceOffering[];
  addOns: AddOn[];
  tables: RestaurantTable[];
  reservations: Reservation[];
  waitlist: WaitlistEntry[];
  notifications: DemoNotification[];
  activity: ActivityEntry[];
  settings: DemoSettings;
  activeCustomerId: string;
  activeOpsPersonaId: string;
}

export interface OpsPersona {
  id: string;
  name: string;
  role: string;
  initials: string;
}

export interface TableAllocation {
  tableIds: string[];
  tables: RestaurantTable[];
  zone: ZoneId;
  capacity: number;
  combined: boolean;
  score: number;
  reason: string;
}

export interface SlotOption {
  time: string;
  startTime: string;
  endTime: string;
  available: boolean;
  past: boolean;
  tablesLeft: number;
  allocation: TableAllocation | null;
  smartPick: boolean;
  reason: string;
  peak: boolean;
}

export interface WaitlistMatch {
  entry: WaitlistEntry;
  allocation: TableAllocation;
}

export type SmartInsightAction =
  | "promote_waitlist"
  | "open_reservation"
  | "view_calendar"
  | "view_floor"
  | "view_queue"
  | "view_waitlist";

export interface SmartInsight {
  id: string;
  severity: "critical" | "warning" | "info" | "success";
  title: string;
  body: string;
  actionLabel: string;
  action: SmartInsightAction;
  reservationId?: string;
  waitlistId?: string;
}

export interface CreateReservationInput {
  serviceId: string;
  dateKey: string;
  time: string;
  partySize: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  addOnIds: string[];
  specialRequests: string;
  tableIds?: string[];
  joinWaitlist?: boolean;
}

export interface CreateReservationResult {
  state: DemoState;
  reservation: Reservation;
  waitlisted: boolean;
  allocation: TableAllocation | null;
  waitlistPosition: number | null;
}

export interface RescheduleInput {
  dateKey: string;
  time: string;
  tableIds?: string[];
}

export interface ModifyReservationInput {
  partySize: number;
  addOnIds: string[];
  specialRequests: string;
}

export type DemoErrorCode =
  | "NO_AVAILABILITY"
  | "CUSTOMER_CONFLICT"
  | "INVALID_INPUT"
  | "INVALID_TRANSITION"
  | "NOT_FOUND"
  | "TABLE_UNAVAILABLE";

export interface DemoMetrics {
  bookingsToday: number;
  guestsToday: number;
  liveOccupancy: number;
  activeTables: number;
  heldTables: number;
  activeCheckIns: number;
  waitlistCount: number;
  waitlistMatches: number;
  noShowRate: number;
  cancellationRate: number;
  revenueTodayCents: number;
  collectedTodayCents: number;
  avgPartySize: number;
  pendingToday: number;
  upcomingTwoHours: number;
}

export interface TrendPoint {
  dateKey: string;
  label: string;
  bookings: number;
  guests: number;
  revenueCents: number;
}

export interface PeakHourPoint {
  hour: number;
  label: string;
  bookings: number;
  covers: number;
}

export interface ServiceMixPoint {
  serviceId: string;
  name: string;
  count: number;
  covers: number;
  share: number;
  accent: string;
}

export interface ZoneUtilizationPoint {
  zone: ZoneId;
  label: string;
  tables: number;
  held: number;
  utilization: number;
}

export interface HeatmapCell {
  dayKey: string;
  dayLabel: string;
  hour: number;
  count: number;
}

export interface HeatmapData {
  hours: number[];
  cells: HeatmapCell[];
  max: number;
}

export interface TableLiveState {
  table: RestaurantTable;
  state: "available" | "occupied" | "reserved" | "maintenance";
  currentReservation: Reservation | null;
  nextReservation: Reservation | null;
}
