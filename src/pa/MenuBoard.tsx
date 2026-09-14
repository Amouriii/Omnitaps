import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { DishSpotlight } from "./DishSpotlight";
import { DISH_PHOTO_BY_ID } from "./dish-images";
import { useScrollReveal } from "../../lib/pa-hooks/use-scroll-reveal";
import { useKineticScroll } from "../../lib/pa-hooks/use-kinetic-scroll";
import { MENU, egp } from "./menu";
import { useNeonFlicker, usePressFeedback } from "../../lib/pa-motion";
import type { CartLine } from "./cart";
import type { MenuSection } from "./menu";

export function MenuBoard({
  onAdd,
}: {
  onAdd: (line: Omit<CartLine, "qty">) => void;
}) {
  const ref = useScrollReveal<HTMLElement>();
  useKineticScroll(ref, "[data-menu-marquee]");
  const headingRef = useNeonFlicker<HTMLHeadingElement>();

  return (
    <section
      id="menu"
      ref={ref}
      className="pa-checkerboard-edge relative isolate overflow-x-clip bg-[#232323] py-20 md:py-28"
    >
      <p
        aria-hidden="true"
        data-menu-marquee
        className="pointer-events-none absolute -top-5 left-0 whitespace-nowrap font-display text-[clamp(5rem,16vw,13rem)] leading-none text-white/[0.04]"
      >
        MENU · FRESH & طازة · MENU
      </p>

      <div className="relative z-10 mx-auto max-w-6xl px-5">
        <div data-reveal>
          <span className="label-mono text-[#29D9FF]">02 · The Menu</span>
          <h2
            ref={headingRef}
            className="mt-4 font-display text-4xl leading-[1.02] text-white sm:text-5xl"
          >
            Diner klassics,{" "}
            <span className="text-[#F2597F] [text-shadow:0_0_18px_#F2597F88]">
              Cairo editions
            </span>
          </h2>
          <p className="mt-4 max-w-xl text-white/60">
            All prices in EGP. Tap a price to drop it in your order.
          </p>
        </div>

        <DishSpotlight onAdd={onAdd} />

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {MENU.map((section) => (
            <MenuCard key={section.id} section={section} onAdd={onAdd} />
          ))}
          <div
            data-reveal
            className="rounded-2xl border-2 border-dashed border-[#C4C8CC]/30 p-6 text-white/50"
          >
            <p className="font-display text-xl text-white/80">
              More koming to the board…
            </p>
            <p className="mt-2 text-sm">
              The full Pablo & Abdo menu is bigger than a web page. Ask at the
              counter about daily specials and what's fresh & طازة today.
            </p>
          </div>
          <p className="sr-only">Prices are samples; confirm before launch.</p>
        </div>

        <p className="mt-8 text-xs leading-relaxed text-white/40">
          Prices are samples in EGP for this direct-order preview, confirm
          current pricing with Pablo & Abdo before launch. Real dish names from
          public reviews.
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
  const cardRef = useScrollReveal<HTMLDivElement>({
    selector: "[data-reveal-item]",
    stagger: 0.05,
    start: "top 90%",
  });
  const press = usePressFeedback();
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set());
  const markLoaded = (id: string) =>
    setLoadedIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  const imgRefs = useRef<Map<string, HTMLImageElement>>(new Map());

  // Cached thumbnails can complete BEFORE React attaches onLoad.
  useEffect(() => {
    for (const [id, img] of imgRefs.current) {
      if (img.complete && img.naturalWidth > 0) markLoaded(id);
    }
  }, []);

  return (
    <div
      ref={cardRef}
      data-reveal
      className="pa-card rounded-2xl border border-[#C4C8CC]/25 bg-white/[0.03] p-6"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-2xl text-white">{section.title}</h3>
        <span className="label-mono text-[#29D9FF]/80">{section.kicker}</span>
      </div>

      <ul className="mt-5 space-y-4">
        {section.items.map((item) => (
          <li
            key={item.id}
            data-reveal-item
            className="flex flex-wrap items-start justify-between gap-3 border-b border-dashed border-white/15 pb-3 last:border-0 last:pb-0"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {(() => {
                const photo = DISH_PHOTO_BY_ID[item.id];
                if (!photo) return null;
                const isLoaded = loadedIds.has(item.id);
                return (
                  <span
                    className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[#C4C8CC]/30 bg-[#C4C8CC]/[0.06]"
                    data-loaded={isLoaded ? "true" : "false"}
                  >
                    {/* skeleton shimmer behind the thumbnail */}
                    <span
                      aria-hidden
                      className="absolute inset-0 animate-none data-[loaded=true]:opacity-0 bg-[linear-gradient(100deg,rgba(196,200,204,0.06)_30%,rgba(196,200,204,0.16)_50%,rgba(196,200,204,0.06)_70%)] bg-[length:220%_100%] transition-opacity duration-300 motion-safe:animate-[pa-shimmer_1.4s_linear_infinite]"
                    />
                    <img
                      ref={(el) => {
                        if (el) imgRefs.current.set(item.id, el);
                        else imgRefs.current.delete(item.id);
                      }}
                      src={photo.src}
                      alt={photo.alt}
                      width={56}
                      height={56}
                      loading="lazy"
                      decoding="async"
                      onLoad={() => markLoaded(item.id)}
                      className={`h-14 w-14 object-cover transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"}`}
                    />
                  </span>
                );
              })()}
              <div className="min-w-0">
                <p className="font-medium text-white">{item.name}</p>
                {item.desc && (
                  <p className="text-sm text-white/60">{item.desc}</p>
                )}
              </div>
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
                  className="pa-price-pill"
                  aria-label={`Add ${item.name}${p.label ? ` (${p.label})` : ""} to order`}
                >
                  {p.label && <span className="opacity-70">{p.label}</span>}
                  {egp(p.price)}
                  <Plus className="h-3 w-3" />
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
