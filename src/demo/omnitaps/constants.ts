import type {
  AddOn,
  Customer,
  OpsPersona,
  ReservationSource,
  ReservationStatus,
  RestaurantTable,
  ServiceOffering,
  ZoneId,
} from "./types";

export const ENTERPRISE = {
  id: "ent_demo_cafe",
  name: "Demo Café",
  slug: "demo",
  address: "14 Harbor Lane, Demo City",
  currency: "USD" as const,
  timezone: "local",
};

export const ZONES: Array<{ id: ZoneId; label: string; description: string }> = [
  { id: "dining_room", label: "Dining Room", description: "Warm oak, low light, full service" },
  { id: "terrace", label: "Terrace", description: "Harbor breeze and brass lanterns" },
  { id: "window_bar", label: "Window Bar", description: "Counter seats facing the water" },
  { id: "private_salon", label: "Private Salon", description: "A quiet room for a longer table" },
];

export const ZONE_LABELS: Record<ZoneId, string> = {
  dining_room: "Dining Room",
  terrace: "Terrace",
  window_bar: "Window Bar",
  private_salon: "Private Salon",
};

export const SERVICES: ServiceOffering[] = [
  {
    id: "svc_coffee",
    name: "Slow Coffee Flight",
    tagline: "Three pours, one quiet hour",
    description:
      "A guided flight through Harbor Lane's filter bar — a bright Ethiopian, a syrupy Colombian, and the house espresso. Served with warm dates.",
    durationMinutes: 60,
    priceCents: 2400,
    priceUnit: "guest",
    zone: "window_bar",
    openTime: "09:00",
    closeTime: "17:30",
    slotMinutes: 30,
    minPartySize: 1,
    maxPartySize: 4,
    highlights: ["Guided by our barista", "Three 90ml pours", "Window counter seating"],
    addOnIds: ["add_quiet", "add_bouquet"],
    accent: "#b8873b",
    badge: "Morning ritual",
  },
  {
    id: "svc_brunch",
    name: "Harbor Brunch",
    tagline: "A long table, a slow morning",
    description:
      "Seasonal plates from the wood oven, house bread, and a bottomless pot of the day's brew. Our most-booked way to spend a weekend morning.",
    durationMinutes: 90,
    priceCents: 4200,
    priceUnit: "guest",
    zone: "dining_room",
    openTime: "11:00",
    closeTime: "15:00",
    slotMinutes: 30,
    minPartySize: 1,
    maxPartySize: 8,
    highlights: ["Wood-oven plates", "Bottomless house brew", "Vegetarian options"],
    addOnIds: ["add_window", "add_highchair", "add_cake", "add_bouquet"],
    accent: "#c45c26",
    badge: "Most booked",
  },
  {
    id: "svc_tea",
    name: "Afternoon Tea",
    tagline: "Brass trays, loose leaf, no rush",
    description:
      "A three-tier stand of scones, petit fours, and tea sandwiches with a pot chosen from the Harbor Lane tea wall. Best on the terrace at golden hour.",
    durationMinutes: 75,
    priceCents: 3400,
    priceUnit: "guest",
    zone: "terrace",
    openTime: "14:00",
    closeTime: "17:30",
    slotMinutes: 30,
    minPartySize: 2,
    maxPartySize: 8,
    highlights: ["Three-tier stand", "Tea wall selection", "Terrace seating"],
    addOnIds: ["add_window", "add_quiet", "add_bouquet"],
    accent: "#c4a35a",
    badge: "Golden hour",
  },
  {
    id: "svc_sundown",
    name: "Terrace Sundown",
    tagline: "Small plates as the harbor turns",
    description:
      "A relaxed terrace sitting with mezze, grilled flatbread, and a house spritz. Tables are held through sunset, with blankets when the breeze picks up.",
    durationMinutes: 90,
    priceCents: 2800,
    priceUnit: "guest",
    zone: "terrace",
    openTime: "17:00",
    closeTime: "22:00",
    slotMinutes: 30,
    minPartySize: 1,
    maxPartySize: 8,
    highlights: ["Sunset terrace", "Small plates", "House spritz"],
    addOnIds: ["add_window", "add_quiet", "add_pairing", "add_cake"],
    accent: "#8c6f2e",
    badge: "Sunset seat",
  },
  {
    id: "svc_supper",
    name: "Harbor Supper",
    tagline: "The full Harbor Lane evening",
    description:
      "Our evening menu in the dining room: fire-roasted vegetables, the day's fish, and something warm for the table. Thoughtful, unfussy, and generous.",
    durationMinutes: 105,
    priceCents: 5800,
    priceUnit: "guest",
    zone: "dining_room",
    openTime: "17:30",
    closeTime: "22:00",
    slotMinutes: 30,
    minPartySize: 1,
    maxPartySize: 10,
    highlights: ["Seasonal evening menu", "Dining room service", "Sommelier pairing available"],
    addOnIds: ["add_window", "add_pairing", "add_cake", "add_bouquet"],
    accent: "#2c1b12",
    badge: "Chef's evening",
  },
  {
    id: "svc_chef",
    name: "Chef's Counter",
    tagline: "Six seats, one very good idea",
    description:
      "An intimate counter tasting with the chef — six courses, a few surprises, and a front-row seat to the pass. Reserved for parties of two to four.",
    durationMinutes: 120,
    priceCents: 9500,
    priceUnit: "guest",
    zone: "window_bar",
    openTime: "18:00",
    closeTime: "22:00",
    slotMinutes: 30,
    minPartySize: 2,
    maxPartySize: 4,
    highlights: ["Six-course tasting", "Chef-led service", "Only 3 tables"],
    addOnIds: ["add_pairing", "add_quiet"],
    accent: "#6d4c41",
    badge: "Small & special",
  },
  {
    id: "svc_private",
    name: "Private Salon Dinner",
    tagline: "A room of your own",
    description:
      "The private salon, a dedicated host, and a family-style menu built around your table. Ideal for celebrations and small company dinners for six to twelve guests.",
    durationMinutes: 150,
    priceCents: 14000,
    priceUnit: "guest",
    zone: "private_salon",
    openTime: "18:00",
    closeTime: "22:00",
    slotMinutes: 30,
    minPartySize: 6,
    maxPartySize: 12,
    highlights: ["Private room + host", "Family-style menu", "Six to twelve guests"],
    addOnIds: ["add_cake", "add_bouquet", "add_pairing"],
    accent: "#7a3e2f",
    badge: "Private room",
  },
];

export const ADD_ONS: AddOn[] = [
  {
    id: "add_window",
    name: "Window preference",
    description: "We'll prioritise a window or terrace edge table when allocating.",
    priceCents: 0,
    unit: "booking",
  },
  {
    id: "add_quiet",
    name: "Quiet corner",
    description: "A softer corner away from the pass and the door.",
    priceCents: 0,
    unit: "booking",
  },
  {
    id: "add_highchair",
    name: "High chair",
    description: "Reserved with the table, set up before you arrive.",
    priceCents: 0,
    unit: "booking",
  },
  {
    id: "add_cake",
    name: "Celebration cake",
    description: "A small olive-oil citrus cake with a candle, made in-house.",
    priceCents: 1800,
    unit: "booking",
  },
  {
    id: "add_pairing",
    name: "Sommelier pairing",
    description: "Three glasses chosen for the menu by our floor sommelier.",
    priceCents: 3200,
    unit: "guest",
  },
  {
    id: "add_bouquet",
    name: "Seasonal bouquet",
    description: "A hand-tied harbor posy waiting at the table.",
    priceCents: 4500,
    unit: "booking",
  },
];

const table = (
  id: string,
  tableNumber: string,
  label: string,
  zone: ZoneId,
  minCapacity: number,
  maxCapacity: number,
  combinableWith: string[],
  shape: RestaurantTable["shape"],
  status: RestaurantTable["status"] = "available",
): RestaurantTable => ({
  id,
  enterpriseId: ENTERPRISE.id,
  tableNumber,
  label,
  zone,
  minCapacity,
  maxCapacity,
  combinableWith,
  status,
  isActive: true,
  shape,
});

export const TABLES: RestaurantTable[] = [
  table("tbl_dr1", "D1", "Harbor two-top", "dining_room", 1, 2, ["tbl_dr2"], "round"),
  table("tbl_dr2", "D2", "Oak two-top", "dining_room", 1, 2, ["tbl_dr1"], "round"),
  table("tbl_dr3", "D3", "Dining four-top", "dining_room", 2, 4, ["tbl_dr4"], "square"),
  table("tbl_dr4", "D4", "Dining four-top", "dining_room", 2, 4, ["tbl_dr3"], "square"),
  table("tbl_dr5", "D5", "Long table", "dining_room", 4, 6, ["tbl_dr6"], "booth"),
  table("tbl_dr6", "D6", "Long table", "dining_room", 4, 6, ["tbl_dr5"], "booth"),
  table("tbl_tr1", "T1", "Terrace two-top", "terrace", 1, 2, ["tbl_tr2"], "round"),
  table("tbl_tr2", "T2", "Terrace two-top", "terrace", 1, 2, ["tbl_tr1"], "round"),
  table("tbl_tr3", "T3", "Terrace four-top", "terrace", 2, 4, ["tbl_tr4"], "square"),
  table("tbl_tr4", "T4", "Terrace four-top", "terrace", 2, 4, ["tbl_tr3"], "square", "maintenance"),
  table("tbl_tr5", "T5", "Terrace six-top", "terrace", 4, 6, [], "booth"),
  table("tbl_wb1", "W1", "Window seat", "window_bar", 1, 2, ["tbl_wb2"], "booth"),
  table("tbl_wb2", "W2", "Window seat", "window_bar", 1, 2, ["tbl_wb1"], "booth"),
  table("tbl_wb3", "W3", "Counter three", "window_bar", 2, 3, [], "booth"),
  table("tbl_ps1", "P1", "Private salon", "private_salon", 6, 10, [], "square"),
  table("tbl_ps2", "P2", "Garden salon", "private_salon", 8, 12, [], "square"),
];

export const CUSTOMER_PERSONAS: Customer[] = [
  {
    id: "cus_maya",
    name: "Maya Hassan",
    email: "maya.hassan@example.com",
    phone: "+20 100 482 1160",
    tier: "Gold",
    visits: 14,
    vip: true,
    notes: "Prefers the window bar. Anniversary in November. No shellfish.",
    memberSince: "2021",
  },
  {
    id: "cus_omar",
    name: "Omar Fahmy",
    email: "omar.fahmy@example.com",
    phone: "+20 101 774 2039",
    tier: "Brass",
    visits: 6,
    vip: false,
    notes: "Usually books brunch for two; likes a quiet corner.",
    memberSince: "2023",
  },
  {
    id: "cus_lina",
    name: "Lina Adel",
    email: "lina.adel@example.com",
    phone: "+20 106 390 5521",
    tier: "Guest",
    visits: 1,
    vip: false,
    notes: "First visit. Joined the smart waitlist for a terrace table.",
    memberSince: "2026",
  },
];

export const GUEST_POOL: Customer[] = [
  ...CUSTOMER_PERSONAS,
  {
    id: "cus_youssef",
    name: "Youssef Kamal",
    email: "youssef.kamal@example.com",
    phone: "+20 100 118 4472",
    tier: "Gold",
    visits: 22,
    vip: true,
    notes: "Regular at the Chef's Counter. Prefers still water.",
    memberSince: "2019",
  },
  {
    id: "cus_dina",
    name: "Dina Fouad",
    email: "dina.fouad@example.com",
    phone: "+20 102 663 8091",
    tier: "Brass",
    visits: 9,
    vip: true,
    notes: "Celebrating a promotion this week. Loves the terrace.",
    memberSince: "2022",
  },
  {
    id: "cus_salma",
    name: "Salma Nabil",
    email: "salma.nabil@example.com",
    phone: "+20 109 240 7715",
    tier: "Guest",
    visits: 3,
    vip: false,
    notes: "Vegetarian. Books the window counter most mornings.",
    memberSince: "2025",
  },
  {
    id: "cus_karim",
    name: "Karim Mostafa",
    email: "karim.mostafa@example.com",
    phone: "+20 100 905 2284",
    tier: "Gold",
    visits: 18,
    vip: false,
    notes: "Often books for four; prefers the dining room.",
    memberSince: "2020",
  },
  {
    id: "cus_hana",
    name: "Hana Sharif",
    email: "hana.sharif@example.com",
    phone: "+20 111 322 6087",
    tier: "Guest",
    visits: 2,
    vip: false,
    notes: "Nut allergy noted on file.",
    memberSince: "2025",
  },
  {
    id: "cus_tarek",
    name: "Tarek Amin",
    email: "tarek.amin@example.com",
    phone: "+20 106 840 1934",
    tier: "Brass",
    visits: 7,
    vip: false,
    notes: "Business dinners; usually pays at the table.",
    memberSince: "2023",
  },
  {
    id: "cus_farah",
    name: "Farah Youssef",
    email: "farah.youssef@example.com",
    phone: "+20 100 557 8820",
    tier: "Guest",
    visits: 4,
    vip: false,
    notes: "Books afternoon tea with her sister.",
    memberSince: "2024",
  },
  {
    id: "cus_nourhan",
    name: "Nourhan Adel",
    email: "nourhan.adel@example.com",
    phone: "+20 102 411 7746",
    tier: "Guest",
    visits: 1,
    vip: false,
    notes: "First visit; found us through the QR menu.",
    memberSince: "2026",
  },
  {
    id: "cus_ziad",
    name: "Ziad Rami",
    email: "ziad.rami@example.com",
    phone: "+20 109 607 3352",
    tier: "Brass",
    visits: 5,
    vip: false,
    notes: "Usually a late supper for two.",
    memberSince: "2024",
  },
];

export const OPS_PERSONAS: OpsPersona[] = [
  { id: "ops_nour", name: "Nour Adel", role: "Floor Manager", initials: "NA" },
  { id: "ops_karim", name: "Karim Saleh", role: "Service Lead", initials: "KS" },
  { id: "ops_mona", name: "Mona Fahmy", role: "General Manager", initials: "MF" },
];

export const STATUS_META: Record<
  ReservationStatus,
  { label: string; chip: string; dot: string; description: string }
> = {
  pending: {
    label: "Pending",
    chip: "border-brass/30 bg-brass-soft text-brass-dark",
    dot: "bg-brass",
    description: "Request received; waiting for the floor to confirm.",
  },
  confirmed: {
    label: "Confirmed",
    chip: "border-tap/20 bg-tap-soft text-tap-dark",
    dot: "bg-tap",
    description: "Table held and confirmed.",
  },
  checked_in: {
    label: "Checked in",
    chip: "border-[#b7e2d1] bg-[#e6f4ef] text-[#0f6b4f]",
    dot: "bg-[#0f6b4f]",
    description: "Guest has arrived and is with the host.",
  },
  seated: {
    label: "Seated",
    chip: "border-[#bfe0c5] bg-[#e8f5e9] text-[#2e6b3a]",
    dot: "bg-[#2e6b3a]",
    description: "Guest is at the table.",
  },
  completed: {
    label: "Completed",
    chip: "border-[#e2ded4] bg-[#f2eee6] text-[#6d655a]",
    dot: "bg-[#8a8175]",
    description: "Visit finished and table released.",
  },
  cancelled: {
    label: "Cancelled",
    chip: "border-[#e4e0d7] bg-[#f7f4ee] text-[#8f887d]",
    dot: "bg-[#b0a89c]",
    description: "Reservation cancelled.",
  },
  no_show: {
    label: "No-show",
    chip: "border-[#f3c9c9] bg-[#fdecec] text-[#a33a3a]",
    dot: "bg-[#a33a3a]",
    description: "Guest did not arrive.",
  },
  waitlisted: {
    label: "Waitlisted",
    chip: "border-brass/30 bg-brass-soft text-brass-dark",
    dot: "bg-brass",
    description: "On the smart waitlist; auto-promoted when a table opens.",
  },
};

export const SOURCE_LABELS: Record<ReservationSource, string> = {
  web: "Online",
  phone: "Phone",
  walk_in: "Walk-in",
  concierge: "Concierge",
};

export const TABLE_STATUS_META: Record<
  RestaurantTable["status"],
  { label: string; className: string }
> = {
  available: { label: "Available", className: "bg-[#e8f5e9] text-[#2e6b3a]" },
  reserved: { label: "Reserved", className: "bg-tap-soft text-tap-dark" },
  occupied: { label: "Occupied", className: "bg-brass-soft text-brass-dark" },
  maintenance: { label: "Maintenance", className: "bg-[#fdecec] text-[#a33a3a]" },
};

export const MAX_DAYS_AHEAD = 10;
export const LEAD_MINUTES = 30;
export const BUFFER_MINUTES = 15;

export function getService(serviceId: string): ServiceOffering | undefined {
  return SERVICES.find((service) => service.id === serviceId);
}

export function getAddOn(addOnId: string): AddOn | undefined {
  return ADD_ONS.find((addOn) => addOn.id === addOnId);
}
