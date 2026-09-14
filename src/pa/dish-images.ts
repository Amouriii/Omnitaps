import { MENU } from "./menu";

/*
 * Dish photography — REAL photos from Pablo & Abdo's official menu site
 * (their own menu QR landing page), downloaded into /public/dishes/ and
 * optimized to ~800px JPEG. Prices come from MENU (single source of truth).
 * To swap any photo: replace the .jpg in /public/dishes/ keeping the name.
 */
export type DishPhoto = {
  /** Menu item id in MENU — price is resolved from there. */
  menuId: string;
  name: string;
  tagline: string;
  /** Small chip label shown on the card, e.g. "01 · BESTSELLER". */
  rank: string;
  src: string;
  alt: string;
};

export const DISHES: DishPhoto[] = [
  {
    menuId: "brisket-burger",
    name: "Beef Brisket Burger",
    tagline: "Smoked low, stacked high on a toasted bun.",
    rank: "01 · BESTSELLER",
    src: "/dishes/brisket-burger.jpg",
    alt: "Pablo & Abdo beef brisket burger — official menu photo",
  },
  {
    menuId: "animal-fries",
    name: "Animal Fries",
    tagline: "Fries drowned in cheese sauce, loaded diner-style.",
    rank: "02 · LOADED",
    src: "/dishes/animal-fries.jpg",
    alt: "Pablo & Abdo animal fries loaded with cheese sauce — official menu photo",
  },
  {
    menuId: "shawarma",
    name: "Egyptian Shawarma Sandwich",
    tagline: "The Cairo half of the fusion — garlic and all.",
    rank: "03 · CAIRO KLASIK",
    src: "/dishes/shawarma.jpg",
    alt: "Pablo & Abdo beef shawarma sandwich — official menu photo",
  },
  {
    menuId: "mac-cheese-brisket",
    name: "Mac & Cheese Brisket",
    tagline: "Two comfort foods, one skillet mash-up.",
    rank: "04 · MASH-UP",
    src: "/dishes/mac-cheese-brisket.jpg",
    alt: "Pablo & Abdo mac and cheese topped with brisket — official menu photo",
  },
  {
    menuId: "bacon-burger",
    name: "Bacon Burger",
    tagline: "Smoked bacon, melted cheese, diner griddle sear.",
    rank: "05 · SMOKED",
    src: "/dishes/bacon-burger.jpg",
    alt: "Pablo & Abdo smoked bacon BBQ burger — official menu photo",
  },
  {
    menuId: "philly",
    name: "Philly Cheesesteak",
    tagline: "Thin-sliced beef, molten cheese, toasted roll.",
    rank: "06 · EAST COAST",
    src: "/dishes/philly.jpg",
    alt: "Pablo & Abdo Philly cheesesteak sandwich — official menu photo",
  },
  {
    menuId: "tacos",
    name: "Tacos",
    tagline: "Brisket de gallo with a Cairo street twist.",
    rank: "07 · FUSION",
    src: "/dishes/tacos.jpg",
    alt: "Pablo & Abdo brisket tacos — official menu photo",
  },
  {
    menuId: "cheese-fries",
    name: "Cheese Fries",
    tagline: "The opener every table starts with.",
    rank: "08 · KLASIK",
    src: "/dishes/cheese-fries.jpg",
    alt: "Pablo & Abdo cheese fries — official menu photo",
  },
];

/** Resolve the add-to-cart line for a dish photo from its MENU price. */
export function dishCartLine(dish: DishPhoto): {
  id: string;
  name: string;
  unitPrice: number;
} {
  for (const section of MENU) {
    const item = section.items.find((i) => i.id === dish.menuId);
    if (item) {
      return {
        id: item.id,
        name: item.name,
        unitPrice: item.prices[0]?.price ?? 0,
      };
    }
  }
  console.warn(`[dish-images] menu item "${dish.menuId}" not found in MENU`);
  return { id: dish.menuId, name: dish.name, unitPrice: 0 };
} /*
 * Photo for EVERY menu item — used by the full menu grid (MenuBoard rows).
 * Rows render ~56px thumbs, so they use the 160px `-thumb` variants (a
 * ~92% smaller decode than the 800px spotlight images — cheap on low-end
 * phones). All photos are the diner's official menu-site photography.
 */
export const DISH_PHOTO_BY_ID: Record<string, { src: string; alt: string }> = {
  "cheese-fries": {
    src: "/dishes/cheese-fries-thumb.jpg",
    alt: "Pablo & Abdo cheese fries — official menu photo",
  },
  "animal-fries": {
    src: "/dishes/animal-fries-thumb.jpg",
    alt: "Pablo & Abdo animal fries loaded with cheese sauce — official menu photo",
  },
  "brisket-burger": {
    src: "/dishes/brisket-burger-thumb.jpg",
    alt: "Pablo & Abdo beef brisket burger — official menu photo",
  },
  "bacon-burger": {
    src: "/dishes/bacon-burger-thumb.jpg",
    alt: "Pablo & Abdo smoked bacon BBQ burger — official menu photo",
  },
  "cheese-bomb": {
    src: "/dishes/cheese-bomb-thumb.jpg",
    alt: "Pablo & Abdo cheesy chicken sandwich — official menu photo",
  },
  philly: {
    src: "/dishes/philly-thumb.jpg",
    alt: "Pablo & Abdo Philly cheesesteak sandwich — official menu photo",
  },
  buffalo: {
    src: "/dishes/buffalo-thumb.jpg",
    alt: "Pablo & Abdo buffalo chicken sandwich — official menu photo",
  },
  shawarma: {
    src: "/dishes/shawarma-thumb.jpg",
    alt: "Pablo & Abdo beef shawarma sandwich — official menu photo",
  },
  "sausage-pita": {
    src: "/dishes/sausage-pita-thumb.jpg",
    alt: "Pablo & Abdo oriental sojok sausage — official menu photo",
  },
  "mac-cheese-brisket": {
    src: "/dishes/mac-cheese-brisket-thumb.jpg",
    alt: "Pablo & Abdo mac and cheese topped with brisket — official menu photo",
  },
  "fteer-brisket": {
    src: "/dishes/fteer-brisket-thumb.jpg",
    alt: "Pablo & Abdo gourmet savory fteer — official menu photo",
  },
  tacos: {
    src: "/dishes/tacos-thumb.jpg",
    alt: "Pablo & Abdo brisket tacos — official menu photo",
  },
};
