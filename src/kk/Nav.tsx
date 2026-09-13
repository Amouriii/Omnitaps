import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Menu, X, ShoppingBag } from "lucide-react";

import { Button } from "../kk/ui/button";
import { gsap } from "../../lib/kk-gsap-config";
import { prefersReducedMotion, usePressFeedback } from "../../lib/kk-motion";

const LINKS = [
  { href: "#story", label: "Story" },
  { href: "#menu", label: "Menu" },
  { href: "#order", label: "Order" },
  { href: "#reserve", label: "Reserve" },
  { href: "#locations", label: "Locations" },
];

export function Nav({ cartCount }: { cartCount: number }) {
  const [open, setOpen] = useState(false);
  const [elevated, setElevated] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const prevCount = useRef(cartCount);
  const press = usePressFeedback();

  // Entrance: header slides down on first paint.
  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar || prefersReducedMotion()) return;
    const tween = gsap.fromTo(
      bar.children,
      { opacity: 0, y: -18 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: "power3.out" },
    );
    return () => {
      tween.kill();
    };
  }, []);

  // Solid/elevated once past roughly the hero height.
  useEffect(() => {
    const onScroll = () => {
      setElevated(window.scrollY > Math.min(window.innerHeight * 0.8, 520));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Badge pops whenever the kart grows.
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

  // Mobile dropdown slides/fades open and closed.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    if (prefersReducedMotion()) {
      gsap.set(panel, { height: "auto", opacity: 1 });
      return;
    }
    const tween = open
      ? gsap.fromTo(
          panel,
          { height: 0, opacity: 0 },
          { height: "auto", opacity: 1, duration: 0.35, ease: "power3.out" },
        )
      : null;
    return () => {
      tween?.kill();
    };
  }, [open]);

  function closeMenu() {
    const panel = panelRef.current;
    if (!panel || prefersReducedMotion()) {
      setOpen(false);
      return;
    }
    gsap.to(panel, {
      height: 0,
      opacity: 0,
      duration: 0.25,
      ease: "power2.in",
      onComplete: () => setOpen(false),
    });
  }

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-[background-color,box-shadow,border-color] duration-300 ${
        elevated
          ? "border-border bg-background/95 shadow-lg shadow-ink/10 backdrop-blur"
          : "border-border/70 bg-background/85 backdrop-blur"
      }`}
    >
      <div
        ref={barRef}
        className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3"
      >
        <a href="#top" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary font-display text-base font-extrabold text-primary-foreground">
            K
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight">
            Koffee Kulture
          </span>
        </a>

        <nav className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="kk-nav-link label-mono text-foreground/70 hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <a href="#order">
              <ShoppingBag className="h-4 w-4" />
              Kart{" "}
              {cartCount > 0 && (
                <span ref={badgeRef} className="inline-block font-mono">
                  ({cartCount})
                </span>
              )}
            </a>
          </Button>
          <button
            {...press}
            className="rounded-md border border-border p-2 md:hidden"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => (open ? closeMenu() : setOpen(true))}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          ref={panelRef}
          className="overflow-hidden border-t border-border bg-background px-5 md:hidden"
        >
          <div className="py-3">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={closeMenu}
                className="block py-2 font-display text-lg font-bold"
              >
                {l.label}
              </a>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
