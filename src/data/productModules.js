import { items as SERVICES } from "./items";

const PRODUCT_PRESENTATION = {
    website: { name: "Websites", summary: "Get found with an on-brand site." },
    "qr-menus": { name: "QR Menus", summary: "Update menus instantly — no reprints." },
    "ai-chatbots": { name: "AI Chat", summary: "Answer guest questions 24/7." },
    reservations: { name: "Reservations", summary: "Fill bookings and waitlists automatically." },
    reviews: { name: "Reviews", summary: "Turn happy visits into stronger ratings." },
    wifi: { name: "Wi-Fi Access", summary: "Connect guests and capture contacts." },
    "apple-wallet": { name: "Wallet Memberships", summary: "Issue branded cards with live status." },
    loyalty: { name: "Loyalty Programs", summary: "Turn visits into measurable retention." },
};

const GROUPS = [
    { title: "Customer", ids: ["website", "qr-menus", "ai-chatbots", "reservations"] },
    { title: "Growth", ids: ["reviews", "wifi"] },
    { title: "Loyalty", ids: ["apple-wallet", "loyalty"] },
];

const SERVICES_BY_ID = new Map(SERVICES.map((item) => [item.id, item]));

function toProductModule(id) {
    const item = SERVICES_BY_ID.get(id);
    if (!item) {
        throw new Error(`Product module "${id}" is not defined in data/items.js`);
    }

    return {
        id: item.id,
        name: PRODUCT_PRESENTATION[item.id]?.name ?? item.title,
        summary: PRODUCT_PRESENTATION[item.id]?.summary ?? item.desc,
        product: true,
    };
}

export const productCategories = GROUPS.map((category) => ({
    title: category.title,
    items: category.ids.map(toProductModule),
}));

export const PRODUCT_MODULE_COUNT = productCategories.reduce(
    (count, category) => count + category.items.length,
    0,
);
