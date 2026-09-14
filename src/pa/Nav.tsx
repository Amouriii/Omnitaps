import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  CalendarCheck,
  Coffee,
  MapPin,
  Menu,
  MessageCircle,
  ShoppingBag,
  Store,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from "lucide-react";

import { Button } from "../kk/ui/button";
import { gsap } from "../../lib/kk-gsap-config";
import { prefersReducedMotion, usePressFeedback } from "../../lib/pa-motion";

type NavLink = { href: string; label: string; icon: LucideIcon };

const LINKS: NavLink[] = [
  { href: "#top", label: "Home", icon: Store },
  { href: "#story", label: "Story", icon: Coffee },
  { href: "#menu", label: "Menu", icon: UtensilsCrossed },
  { href: "#order", label: "Order", icon: ShoppingBag },
  { href: "#reserve", label: "Reserve", icon: CalendarCheck },
  { href: "#find", label: "Find Us", icon: MapPin },
];

function useActiveSection(): string {
  const [active, setActive] = useState("#top");
  useEffect(() => {
    const ids = LINKS.map((l) => l.href.slice(1));
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(`#${visible.target.id}`);
      },
      { rootMargin: "-20% 0px -40% 0px", threshold: [0, 0.25, 0.5] },
    );
    for (const s of sections) observer.observe(s);
    return () => observer.disconnect();
  }, []);
  return active;
}

function CartBadge({
  count,
  className = "",
}: {
  count: number;
  className?: string;
}) {
  if (count <= 0) return null;
  return (
    <span
      className={`grid min-w-5 place-items-center rounded-full bg-[#F2597F] px-1.5 font-mono text-[10px] leading-5 text-white shadow-[0_0_10px_#F2597F] ${className}`}
    >
      {count}
    </span>
  );
}

export function Nav({ cartCount }: { cartCount: number }) {
  const [open, setOpen] = useState(false);
  const active = useActiveSection();
  const badgeRef = useRef<HTMLSpanElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const railNavRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const prevCount = useRef(cartCount);
  const press = usePressFeedback();

  // Badge pops whenever the cart grows.
  useEffect(() => {
    const grew = cartCount > prevCount.current;
    prevCount.current = cartCount;
    const badge = badgeRef.current;
    if (!grew || !badge || prefersReducedMotion()) return;
    gsap.fromTo(
      badge,
      { scale: 1 },
      { scale: 1.5, duration: 0.14, ease: "power2.out", yoyo: true, repeat: 1 },
    );
  }, [cartCount]);

  // Scroll-spy glide: one neon indicator slides to the active rail link
  // instead of popping per-link. Measured from the real link elements so it
  // stays correct if labels/layout change.
  useEffect(() => {
    const nav = railNavRef.current;
    const dot = indicatorRef.current;
    if (!nav || !dot) return;
    const link = nav.querySelector<HTMLAnchorElement>(`a[href="${active}"]`);
    if (!link) return;
    const top = link.offsetTop;
    const height = link.offsetHeight;
    if (prefersReducedMotion()) {
      gsap.set(dot, { top, height });
      return;
    }
    gsap.to(dot, { top, height, duration: 0.35, ease: "power3.out" });
  }, [active]);

  // Drawer + backdrop slide in from the left.
  useLayoutEffect(() => {
    const drawer = drawerRef.current;
    const backdrop = backdropRef.current;
    if (!drawer) return;
    if (prefersReducedMotion()) {
      gsap.set(drawer, { x: open ? "0%" : "-100%" });
      if (backdrop) gsap.set(backdrop, { opacity: open ? 1 : 0 });
      return;
    }
    const tween = open
      ? gsap.fromTo(
          drawer,
          { x: "-100%" },
          { x: "0%", duration: 0.35, ease: "power3.out" },
        )
      : null;
    if (backdrop) {
      gsap.to(backdrop, { opacity: open ? 1 : 0, duration: 0.25 });
    }
    return () => {
      tween?.kill();
    };
  }, [open]);

  // Close on Escape while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const linkCls = (href: string) =>
    `group relative flex w-full flex-col items-center gap-1 rounded-lg py-2.5 transition-colors ${
      active === href ? "text-white" : "text-white/55 hover:text-white"
    }`;

  return (
    <>
      {/* ---------- Desktop: fixed left rail ---------- */}
      <aside
        aria-label="Site navigation"
        className="fixed left-0 top-0 z-50 hidden h-[100dvh] w-20 flex-col items-center border-r border-white/10 bg-[#232323]/95 backdrop-blur lg:flex"
      >
        {/* neon edge */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 h-full w-px bg-gradient-to-b from-[#F2597F]/60 via-[#29D9FF]/30 to-transparent"
        />

        {/* logo */}
        <a
          href="#top"
          className="flex flex-col items-center gap-1.5 py-5"
          aria-label="Pablo & Abdo, home"
        >
          <span
            translate="no"
            className="pa-signage pa-signage--logo font-display text-lg"
          >
            P&A
          </span>
          <span className="pa-checkerboard h-1.5 w-10" aria-hidden="true" />
        </a>

        {/* section links */}
        <nav
          ref={railNavRef}
          className="relative mt-2 flex w-full flex-1 flex-col items-center gap-1 px-2"
        >
          {/* gliding scroll-spy indicator (position driven by GSAP) */}
          <span
            ref={indicatorRef}
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 w-1 rounded-r-full bg-[#F2597F] shadow-[0_0_10px_#F2597F]"
          />
          {LINKS.map(({ href, label, icon: Icon }) => (
            <a key={href} href={href} className={linkCls(href)} title={label}>
              <Icon
                className={`h-5 w-5 transition-[filter,color] ${
                  active === href
                    ? "text-[#F2597F] drop-shadow-[0_0_8px_#F2597F]"
                    : ""
                }`}
                aria-hidden="true"
              />
              <span className="font-mono text-[9px] uppercase tracking-widest">
                {label}
              </span>
            </a>
          ))}
        </nav>

        {/* bottom cluster: cart CTA + whatsapp */}
        <div className="flex w-full flex-col items-center gap-3 border-t border-white/10 px-2 py-4">
          <a
            href="#order"
            className="relative flex flex-col items-center gap-1 rounded-lg py-2 text-white/80 transition-colors hover:text-white"
            title="Your order"
          >
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            <CartBadge count={cartCount} className="absolute right-1 top-0" />
            <span className="font-mono text-[9px] uppercase tracking-widest">
              Tray
            </span>
          </a>
          <a
            href="#order"
            className="grid h-10 w-10 place-items-center rounded-full bg-[#25D366] text-[#0b2e17] shadow-[0_0_14px_rgba(37,211,102,0.4)] transition-transform hover:scale-105"
            title="Order on WhatsApp"
            aria-label="Order on WhatsApp"
          >
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
          </a>
        </div>
      </aside>

      {/* ---------- Mobile: top bar + drawer ---------- */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#232323]/90 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <a href="#top" className="flex items-center gap-2.5">
            <span className="pa-signage pa-signage--logo font-display text-xl">
              P&A
            </span>
            <span className="font-display text-lg tracking-tight">
              Pablo <span className="text-white/50">&</span> Abdo
            </span>
          </a>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <a href="#order">
                <ShoppingBag className="h-4 w-4" />
                Tray{" "}
                {cartCount > 0 && (
                  <span ref={badgeRef} className="inline-block font-mono">
                    ({cartCount})
                  </span>
                )}
              </a>
            </Button>
            <button
              {...press}
              className="rounded-md border border-white/20 p-2"
              aria-label="Toggle menu"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div
            ref={backdropRef}
            aria-hidden="true"
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <nav
            ref={drawerRef}
            aria-label="Mobile navigation"
            className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-white/10 bg-[#232323] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <span className="pa-signage pa-signage--logo font-display text-lg">
                P&A
              </span>
              <button
                {...press}
                className="rounded-md border border-white/20 p-2"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4">
              {LINKS.map(({ href, label, icon: Icon }) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`group relative flex items-center gap-3 overflow-hidden rounded-lg px-3 py-3 font-display text-lg transition-colors ${
                    active === href
                      ? "bg-white/5 text-[#F2597F]"
                      : "text-white/80 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {label}
                  {href === "#order" && cartCount > 0 && (
                    <CartBadge count={cartCount} className="ml-auto" />
                  )}
                  {/* neon underline — draws in on active, ghost-draws on hover */}
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-x-3 bottom-1 h-0.5 origin-left rounded-full bg-gradient-to-r from-[#F2597F] to-[#29D9FF] shadow-[0_0_10px_#F2597F] transition-transform duration-300 ease-out ${
                      active === href
                        ? "scale-x-100 opacity-100"
                        : "scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-40"
                    }`}
                  />
                </a>
              ))}
            </div>
            <div className="border-t border-white/10 px-5 py-4">
              <p className="label-mono text-[10px] text-white/50">
                Fresh & طازة · Heliopolis
              </p>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
