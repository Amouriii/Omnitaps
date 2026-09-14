import { useLayoutEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";

import { WHATSAPP_NUMBER, egp, LOCATION } from "./menu";
import { gsap } from "../../lib/kk-gsap-config";
import { prefersReducedMotion } from "../../lib/pa-motion";
import type { CartLine } from "./cart";

/*
 * Floating WhatsApp order button — the standard direct-ordering channel for
 * Cairo diners. Builds an itemized wa.me message from the live cart (names,
 * quantities, EGP line totals) so the order arrives ready to confirm.
 *
 * If WHATSAPP_NUMBER isn't configured yet, the button explains itself (toast)
 * instead of opening a chat with a wrong number — same rule as payments: the
 * site never fakes a working channel.
 */

export function buildWhatsAppUrl(lines: CartLine[]): string {
  const now = new Date().toLocaleString("en-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const itemLines = lines.map(
    (l) =>
      `• ${l.qty}x ${l.name}${l.size ? ` (${l.size})` : ""}, ${egp(l.unitPrice * l.qty)}`,
  );

  const message = [
    `Hi ${LOCATION.name}! I'd like to order:`,
    "",
    ...itemLines,
    "",
    `Sent from the website · ${now}`,
  ].join("\n");

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function WhatsAppOrder({ cart }: { cart: CartLine[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pulseRef = useRef<HTMLSpanElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const prevCount = useRef(cart.reduce((s, l) => s + l.qty, 0));
  // Hydration-safe entrance: server and first client render agree on the
  // hidden state; visibility is decided after mount (SSR can't know
  // prefers-reduced-motion).
  const [entranceDone, setEntranceDone] = useState(false);

  // Slide in shortly after load so it reads as part of the site, not an ad.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      setEntranceDone(true);
      return;
    }
    const tween = gsap.fromTo(
      el,
      { y: 90, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.6,
        delay: 0.9,
        ease: "power3.out",
        onComplete: () => setEntranceDone(true),
      },
    );
    return () => {
      tween.kill();
    };
  }, []);

  // Pop the badge when the cart grows; gentle pulse ring to invite the tap.
  useLayoutEffect(() => {
    const count = cart.reduce((s, l) => s + l.qty, 0);
    const grew = count > prevCount.current;
    prevCount.current = count;
    const badge = countRef.current;
    const pulse = pulseRef.current;
    if (!grew || !badge || prefersReducedMotion()) return;
    gsap.fromTo(
      badge,
      { scale: 1 },
      {
        scale: 1.45,
        duration: 0.14,
        ease: "power2.out",
        yoyo: true,
        repeat: 1,
      },
    );
    if (pulse) {
      gsap.fromTo(
        pulse,
        { opacity: 0.7, scale: 1 },
        { opacity: 0, scale: 1.6, duration: 0.9, ease: "power2.out" },
      );
    }
  }, [cart]);

  function onClick() {
    if (cart.length === 0) {
      // Gentle nudge toward the menu instead of an empty order message.
      const menu = document.getElementById("menu");
      menu?.scrollIntoView({ behavior: "smooth", block: "start" });
      import("sonner").then(({ toast }) => {
        toast("Your tray is empty. Pick something fresh & طازة first.", {
          description: "Tap any price on the menu, then send it on WhatsApp.",
        });
      });
      return;
    }
    if (!WHATSAPP_NUMBER) {
      import("sonner").then(({ toast }) => {
        toast.error("WhatsApp ordering is being connected.", {
          description:
            "The diner's WhatsApp number isn't set up yet. Meanwhile, the order form below sends straight to the kitchen.",
        });
      });
      document.getElementById("order")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    window.open(buildWhatsAppUrl(cart), "_blank", "noopener,noreferrer");
  }

  const count = cart.reduce((s, l) => s + l.qty, 0);

  return (
    <div
      ref={wrapRef}
      className={`pa-safe-bottom fixed bottom-5 right-5 z-50 sm:bottom-7 sm:right-7 ${
        entranceDone ? "translate-y-0 opacity-100" : "opacity-0"
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={
          count > 0
            ? `Send order of ${count} item${count === 1 ? "" : "s"} on WhatsApp`
            : "Order on WhatsApp"
        }
        className="wa-fab group relative flex items-center gap-2.5 rounded-full bg-[#25D366] py-3 pl-4 pr-5 font-medium text-[#0b2e17] shadow-[0_10px_30px_rgba(0,0,0,0.45)] transition-transform hover:scale-[1.04] active:scale-95"
      >
        <span
          ref={pulseRef}
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-[#25D366] opacity-0"
        />
        <MessageCircle className="h-5 w-5" aria-hidden="true" />
        <span className="hidden text-sm sm:inline">
          {count > 0 ? "Send order" : "Order on WhatsApp"}
        </span>
        {count > 0 && (
          <span
            ref={countRef}
            className="grid h-6 min-w-6 place-items-center rounded-full bg-[#232323] px-1.5 font-mono text-xs text-white"
          >
            {count}
          </span>
        )}
      </button>
    </div>
  );
}
