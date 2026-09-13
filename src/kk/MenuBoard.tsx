import { Plus } from "lucide-react";

import { useScrollReveal } from "../../lib/kk-hooks/use-scroll-reveal";
import { useKineticScroll } from "../../lib/kk-hooks/use-kinetic-scroll";
import { MENU, egp } from "../../lib/kk-menu";
import { usePressFeedback } from "../../lib/kk-motion";
import type { CartLine } from "../kk/cart";
import type { MenuSection } from "../../lib/kk-menu";

const INDICATIVE = new Set(["kroissants", "benedicts", "salads"]);

export function MenuBoard({
  onAdd,
}: {
  onAdd: (line: Omit<CartLine, "qty">) => void;
}) {
  const ref = useScrollReveal<HTMLElement>();
  useKineticScroll(ref, "[data-menu-marquee]");

  return (
    <section
      id="menu"
      ref={ref}
      className="terrazzo relative isolate overflow-x-clip border-y border-border py-16 md:py-24"
    >
      <p
        aria-hidden="true"
        data-menu-marquee
        className="pointer-events-none absolute -top-5 left-0 whitespace-nowrap font-display text-[clamp(5rem,16vw,13rem)] font-extrabold leading-none tracking-[-0.08em] text-ink/10"
      >
        KOFFEE · KULTURE · KOFFEE · KULTURE
      </p>
      <div className="relative z-10 mx-auto max-w-6xl px-5">
        <div data-reveal>
          <span className="label-mono text-accent">02 — The Menu</span>
          <h2 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">
            Kold, hot and everything between
          </h2>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            All prices in EGP. Tap a price to drop it in your kart.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {MENU.map((section) => (
            <MenuCard key={section.id} section={section} onAdd={onAdd} />
          ))}
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          {egp(50)} espresso to {egp(150)} large iced pistachio — koffee prices
          sourced from a public menu listing.
        </p>
      </div>
    </section>
  );
}

function MenuCard({
  section,
  onAdd,
}: {
  section: MenuSection;
  onAdd: (line: Omit<CartLine, "qty">) => void;
}) {
  // Each card runs its own small stagger, triggered when that card scrolls
  // into view — so rows further down the page don't inherit a long delay.
  const cardRef = useScrollReveal<HTMLDivElement>({
    selector: "[data-reveal-item]",
    stagger: 0.05,
    start: "top 90%",
  });
  const press = usePressFeedback();

  return (
    <div
      ref={cardRef}
      data-reveal
      className="kk-card rounded-2xl border border-border bg-card p-6"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-2xl font-extrabold">
          {section.title}
        </h3>
        <span className="label-mono text-muted-foreground">
          {section.kicker}
        </span>
      </div>

      <ul className="mt-5 space-y-4">
        {section.items.map((item) => (
          <li
            key={item.id}
            data-reveal-item
            className="flex flex-wrap items-start justify-between gap-3 border-b border-dashed border-border pb-3 last:border-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="font-medium">{item.name}</p>
              {item.desc && (
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              {item.prices.map((p) => (
                <button
                  key={(p.label ?? "") + p.price}
                  {...press}
                  onClick={() =>
                    onAdd({
                      id: item.id + (p.label ? `-${p.label}` : ""),
                      name: item.name,
                      size: p.label,
                      unitPrice: p.price,
                    })
                  }
                  className="kk-button group inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 font-mono text-xs transition-colors hover:bg-primary hover:text-primary-foreground"
                  aria-label={`Add ${item.name}${p.label ? ` (${p.label})` : ""} to kart`}
                >
                  {p.label && <span className="opacity-70">{p.label}</span>}
                  {p.price}
                  <Plus className="h-3 w-3" />
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>

      {INDICATIVE.has(section.id) && (
        <p className="mt-4 text-xs text-muted-foreground">
          Food prices shown are indicative — confirm in-store.
        </p>
      )}
    </div>
  );
}
