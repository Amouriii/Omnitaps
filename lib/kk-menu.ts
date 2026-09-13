export type MenuItem = {
  id: string;
  name: string;
  desc?: string;
  /** Price in EGP. Items with two sizes list both. */
  prices: { label?: string; price: number }[];
};

export type MenuSection = {
  id: string;
  title: string;
  kicker: string;
  items: MenuItem[];
};

export const MENU: MenuSection[] = [
  {
    id: "koffee",
    title: "Koffee",
    kicker: "Hot & honest",
    items: [
      { id: "espresso", name: "Espresso", prices: [{ price: 50 }] },
      { id: "kappuccino", name: "Kappuccino", prices: [{ price: 80 }] },
      { id: "latte", name: "Latte", prices: [{ price: 90 }] },
      { id: "flat-white", name: "Flat White", prices: [{ price: 70 }] },
      { id: "cortado", name: "Cortado", prices: [{ price: 70 }] },
      { id: "spanish-latte", name: "Spanish Latte", prices: [{ price: 100 }] },
    ],
  },
  {
    id: "iced",
    title: "Iced & Kold Klassics",
    kicker: "Served in the Koffee Kan",
    items: [
      {
        id: "iced-latte",
        name: "Iced Latte",
        prices: [
          { label: "M", price: 80 },
          { label: "L", price: 100 },
        ],
      },
      {
        id: "iced-spanish",
        name: "Iced Spanish",
        prices: [
          { label: "M", price: 100 },
          { label: "L", price: 115 },
        ],
      },
      { id: "pistachio-latte", name: "Pistachio Latte", prices: [{ price: 125 }] },
      {
        id: "iced-pistachio",
        name: "Iced Pistachio",
        prices: [
          { label: "M", price: 125 },
          { label: "L", price: 150 },
        ],
      },
    ],
  },
  {
    id: "matcha",
    title: "Matcha",
    kicker: "Green on green",
    items: [
      {
        id: "iced-matcha",
        name: "Iced Matcha",
        prices: [
          { label: "M", price: 95 },
          { label: "L", price: 100 },
        ],
      },
      {
        id: "matcha-frappe",
        name: "Blended Matcha Frappe",
        prices: [
          { label: "M", price: 100 },
          { label: "L", price: 115 },
        ],
      },
    ],
  },
  {
    id: "kulture",
    title: "Kulture Kold Klassics & Specialties",
    kicker: "The photogenic ones",
    items: [
      { id: "raspberry", name: "Raspberry", prices: [{ price: 110 }] },
      { id: "blueberry", name: "Blueberry", prices: [{ price: 110 }] },
      { id: "passion", name: "Passion", prices: [{ price: 110 }] },
      { id: "cocoberry", name: "Cocoberry", prices: [{ price: 110 }] },
    ],
  },
  {
    id: "smoothies",
    title: "Smoothies",
    kicker: "Fruit forward",
    items: [
      { id: "pina-colada", name: "Pina Colada", prices: [{ price: 120 }] },
      { id: "watermelon", name: "Watermelon", prices: [{ price: 90 }] },
    ],
  },
  {
    id: "kroissants",
    title: "Kroissants",
    kicker: "Baked, buttered, gone by noon",
    items: [
      { id: "all-butter", name: "All Butter Kroissant", prices: [{ price: 85 }] },
      { id: "pistachio-k", name: "Pistachio Kroissant", prices: [{ price: 130 }] },
      { id: "lotus-k", name: "Lotus Biscoff Kroissant", prices: [{ price: 125 }] },
      { id: "choko-k", name: "Choko Kroissant", prices: [{ price: 110 }] },
    ],
  },
  {
    id: "benedicts",
    title: "Benedicts & Bagels",
    kicker: "Breakfast Kulture",
    items: [
      { id: "benedict-kulture", name: "The Benedict Kulture", desc: "The house benedict", prices: [{ price: 195 }] },
      {
        id: "the-wild",
        name: "The Wild",
        desc: "Mushroom, spinach, beetroot, avocado",
        prices: [{ price: 210 }],
      },
      {
        id: "the-karnivore",
        name: "The Karnivore",
        desc: "Shredded beef, hollandaise",
        prices: [{ price: 240 }],
      },
      { id: "the-la", name: "The LA", desc: "Smoked salmon bagel", prices: [{ price: 250 }] },
    ],
  },
  {
    id: "salads",
    title: "Salads",
    kicker: "Green, but make it editorial",
    items: [
      { id: "caesar", name: "Caesar", prices: [{ price: 180 }] },
      { id: "quinoa-lover", name: "Quinoa Lover", prices: [{ price: 195 }] },
      { id: "ultimate-halloumi", name: "Ultimate Halloumi", prices: [{ price: 200 }] },
    ],
  },
];

export const TAX_RATE = 0.14; // sample VAT rate — confirm with the owner before launch
export const DELIVERY_FEE = 35; // EGP

export const egp = (n: number) =>
  `${n.toLocaleString("en-EG", { maximumFractionDigits: 2 })} EGP`;
