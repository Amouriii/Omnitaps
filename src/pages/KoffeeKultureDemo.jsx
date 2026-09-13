import { useCallback, useEffect, useState } from "react";
import { Toaster } from "sonner";
import "../styles/kk-demo.css";
import { Nav } from "../kk/Nav";
import { Hero } from "../kk/Hero";
import { PourTheKan } from "../kk/PourTheKan";
import { Story } from "../kk/Story";
import { MenuBoard } from "../kk/MenuBoard";
import { OrderPanel } from "../kk/OrderPanel";
import { Reserve } from "../kk/Reserve";
import { Locations, Footer } from "../kk/Locations";
import { ScrollProgress } from "../kk/ScrollProgress";
import { LenisProvider } from "../../lib/kk-lenis-provider";
import {
  readKoffeeKultureCart,
  writeKoffeeKultureCart,
} from "../../lib/kk-demo-utils";

/**
 * The integration intentionally keeps the original Koffee Kulture page
 * composition intact. The host app only supplies the route and demo runtime;
 * the visual surface remains the source project's own site.
 */
export default function KoffeeKultureDemo() {
  const [cart, setCart] = useState(readKoffeeKultureCart);

  useEffect(() => {
    writeKoffeeKultureCart(cart);
  }, [cart]);

  useEffect(() => {
    const previousTitle = document.title;
    const root = document.documentElement;
    document.title = "Koffee Kulture — Specialty Koffee & Breakfast Kulture, Egypt";
    root.classList.add("kk-demo-active");
    return () => {
      document.title = previousTitle;
      root.classList.remove("kk-demo-active");
    };
  }, []);

  const add = useCallback((line) => {
    setCart((prev) => {
      const found = prev.find((item) => item.id === line.id);
      if (found) {
        return prev.map((item) =>
          item.id === line.id ? { ...item, qty: item.qty + 1 } : item,
        );
      }
      return [...prev, { ...line, qty: 1 }];
    });
  }, []);

  const setQty = useCallback((id, qty) => {
    setCart((prev) =>
      qty <= 0
        ? prev.filter((item) => item.id !== id)
        : prev.map((item) => (item.id === id ? { ...item, qty } : item)),
    );
  }, []);

  const remove = useCallback((id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return (
    <LenisProvider>
      <div className="kk-demo-route min-h-screen bg-background text-foreground">
        <Toaster
          position="bottom-right"
          theme="light"
          toastOptions={{
            classNames: {
              toast: "kk-toast",
              title: "kk-toast__title",
              description: "kk-toast__description",
            },
          }}
        />
        <ScrollProgress />
        <Nav cartCount={cart.reduce((sum, item) => sum + item.qty, 0)} />
        <main>
          <Hero />
          <PourTheKan />
          <Story />
          <MenuBoard onAdd={add} />
          <OrderPanel cart={cart} setQty={setQty} remove={remove} />
          <Reserve />
          <Locations />
        </main>
        <Footer />
      </div>
    </LenisProvider>
  );
}
