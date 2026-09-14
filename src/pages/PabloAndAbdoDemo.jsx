import { useCallback, useEffect, useState } from "react";
import { Toaster } from "sonner";
import "../styles/pa-demo.css";
import { Nav } from "../pa/Nav";
import { Hero } from "../pa/Hero";
import { KineticBand } from "../pa/KineticBand";
import { Story } from "../pa/Story";
import { MenuBoard } from "../pa/MenuBoard";
import { OrderPanel } from "../pa/OrderPanel";
import { Reserve } from "../pa/Reserve";
import { Locations, Footer } from "../pa/Locations";
import { ScrollProgress } from "../pa/ScrollProgress";
import { WhatsAppOrder } from "../pa/WhatsAppOrder";
import { loadCart, saveCart } from "../pa/cart";
import { LenisProvider } from "../../lib/kk-lenis-provider";

export default function PabloAndAbdoDemo() {
  const [cart, setCart] = useState([]);

  useEffect(() => {
    setCart(loadCart());
  }, []);

  useEffect(() => {
    saveCart(cart);
  }, [cart]);

  useEffect(() => {
    const previousTitle = document.title;
    const root = document.documentElement;
    document.title = "Pablo & Abdo — The American/Egyptian Diner Experience";
    root.classList.add("pa-demo-active");
    return () => {
      document.title = previousTitle;
      root.classList.remove("pa-demo-active");
    };
  }, []);

  const add = useCallback((line) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === line.id);
      if (existing) {
        return current.map((item) => item.id === line.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...current, { ...line, qty: 1 }];
    });
  }, []);

  const setQty = useCallback((id, qty) => {
    setCart((current) => qty <= 0
      ? current.filter((item) => item.id !== id)
      : current.map((item) => item.id === id ? { ...item, qty } : item));
  }, []);

  const remove = useCallback((id) => {
    setCart((current) => current.filter((item) => item.id !== id));
  }, []);

  return (
    <LenisProvider>
      <div className="pa-demo-route min-h-screen bg-[#232323] text-white">
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            classNames: {
              toast: "pa-toast",
              title: "pa-toast__title",
              description: "pa-toast__description",
            },
          }}
        />
        <ScrollProgress />
        <Nav cartCount={cart.reduce((sum, item) => sum + item.qty, 0)} />
        <div className="lg:pl-20">
          <main>
            <Hero />
            <KineticBand />
            <Story />
            <MenuBoard onAdd={add} />
            <OrderPanel cart={cart} setQty={setQty} remove={remove} />
            <Reserve />
            <Locations />
          </main>
          <Footer />
          <WhatsAppOrder cart={cart} />
        </div>
      </div>
    </LenisProvider>
  );
}
