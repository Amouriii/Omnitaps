export type MenuItem = {
  id: string;
  name: string;
  desc?: string;
  /** Price in EGP. */
  prices: { label?: string; price: number }[];
};

export type MenuSection = {
  id: string;
  title: string;
  kicker: string;
  items: MenuItem[];
};

/*
 * Real dish names from public reviews of Pablo & Abdo (Heliopolis, Cairo).
 * ALL prices are SAMPLES in EGP — confirm real pricing with the owner before launch.
 */
export const MENU: MenuSection[] = [
  {
    id: "fries",
    title: "Fries & Sides",
    kicker: "The opener",
    items: [
      { id: "cheese-fries", name: "Cheese Fries", prices: [{ price: 150 }] },
      {
        id: "animal-fries",
        name: "Animal Fries",
        desc: "Loaded, In-N-Out style",
        prices: [{ price: 140 }],
      },
    ],
  },
  {
    id: "sandwiches",
    title: "Burgers & Sandwiches",
    kicker: "Handheld kulture",
    items: [
      {
        id: "brisket-burger",
        name: "Beef Brisket Burger",
        prices: [{ price: 180 }],
      },
      { id: "bacon-burger", name: "Bacon Burger", prices: [{ price: 170 }] },
      {
        id: "cheese-bomb",
        name: "Cheese Bomb Chicken Sandwich",
        prices: [{ price: 160 }],
      },
      {
        id: "philly",
        name: "Philly Cheesesteak",
        prices: [{ price: 190 }],
      },
      {
        id: "buffalo",
        name: "Buffalo Chicken Sandwich",
        prices: [{ price: 150 }],
      },
      {
        id: "shawarma",
        name: "Egyptian Shawarma Sandwich",
        desc: "The Cairo half of the fusion",
        prices: [{ price: 120 }],
      },
      {
        id: "sausage-pita",
        name: "Spicy Sausage in Pita",
        prices: [{ price: 130 }],
      },
    ],
  },
  {
    id: "mashups",
    title: "Diner Mash-ups",
    kicker: "Where the two worlds meet",
    items: [
      {
        id: "mac-cheese-brisket",
        name: "Mac & Cheese Brisket",
        prices: [{ price: 220 }],
      },
      {
        id: "fteer-brisket",
        name: "Savory Fteer Brisket",
        desc: "Egyptian fteer, diner filling",
        prices: [{ price: 200 }],
      },
      { id: "tacos", name: "Tacos", prices: [{ price: 140 }] },
    ],
  },
];

export const TAX_RATE = 0.14; // sample VAT rate — confirm with the owner before launch
export const DELIVERY_FEE = 35; // EGP, sample — confirm with the owner

export const LOCATION = {
  name: "Pablo & Abdo",
  street: "96 Omar Ibn El-Khattab",
  area: "Almazah, Heliopolis",
  city: "Cairo Governorate, Egypt",
};

/*
 * WhatsApp direct ordering — the standard channel for Cairo diners.
 * Set the diner's real WhatsApp business number here in full international
 * format WITHOUT a leading + (WhatsApp wa.me format), e.g. Egypt +20 10 1234
 * 5678 -> "201012345678".
 * Until it is set, the floating button explains itself instead of opening a
 * chat with a wrong number — the site never fakes a working channel.
 */
export const WHATSAPP_NUMBER = "201123360043"; // owner's WhatsApp — guests' orders/reservations land here

export const egp = (n: number) =>
  `${n.toLocaleString("en-EG", { maximumFractionDigits: 2 })} EGP`;
