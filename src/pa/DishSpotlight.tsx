import { Plus } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  DISHES,
  dishCartLine,
  type DishPhoto,
} from "./dish-images";
import { egp } from "./menu";
import { usePressFeedback } from "../../lib/pa-motion";

/**
 * "Top dishes" photo spotlight — big neon-framed cards for the headliners.
 * Images are placeholders from /public/dishes/ (see dish-images.ts) and are
 * swapped for real photography without touching this component.
 */
export function DishSpotlight({
  onAdd,
}: {
  onAdd: (line: { id: string; name: string; unitPrice: number }) => void;
}) {
  const press = usePressFeedback();

  return (
    <div className="mt-10">
      <div data-reveal className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-2xl text-white">Top dishes</h3>
        <span className="label-mono text-[#29D9FF]/80">
          Straight from the pass
        </span>
      </div>

      <ul className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {DISHES.map((dish) => (
          <DishCard key={dish.menuId} dish={dish} onAdd={onAdd} press={press} />
        ))}
      </ul>
    </div>
  );
}

function DishCard({
  dish,
  onAdd,
  press,
}: {
  dish: DishPhoto;
  onAdd: (line: { id: string; name: string; unitPrice: number }) => void;
  press: { onPointerDown: (e: React.PointerEvent<HTMLElement>) => void };
}) {
  const [added, setAdded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Cached images can complete BEFORE React attaches onLoad — check on mount.
  useLayoutEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, []);

  function add() {
    const line = dishCartLine(dish);
    onAdd(line);
    toast.success(`Added ${dish.name} to your order.`);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  }

  return (
    <li data-reveal className="pa-card h-full">
      <figure
        className="pa-neon-frame relative flex h-full flex-col"
        data-loaded={loaded ? "true" : "false"}
      >
        <div className="relative overflow-hidden rounded-t-[calc(1rem-1px)]">
          <img
            ref={imgRef}
            src={dish.src}
            alt={dish.alt}
            width={800}
            height={800}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            className={`aspect-square w-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
          />
          <span
            aria-hidden="true"
            className="absolute left-3 top-3 rounded-full border border-[#F2597F]/60 bg-[#232323]/85 px-2.5 py-1 font-mono text-[0.65rem] tracking-widest text-[#F2597F]"
          >
            {dish.rank}
          </span>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent"
          />
        </div>

        <figcaption className="flex flex-1 flex-col gap-2 p-4">
          <p className="font-display text-lg leading-tight text-white">
            {dish.name}
          </p>
          <p className="text-sm leading-snug text-white/60">{dish.tagline}</p>
          <button
            type="button"
            {...press}
            onClick={add}
            className="pa-price-pill mt-auto w-full justify-center !py-2 text-sm"
            aria-label={`Add ${dish.name} (${egp(dishCartLine(dish).unitPrice)}) to order`}
          >
            {added ? (
              "In the tray ✓"
            ) : (
              <>
                Add · {egp(dishCartLine(dish).unitPrice)}
                <Plus className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </figcaption>
      </figure>
    </li>
  );
}
