import { useState } from "react";
import NutritionDetails from "./NutritionDetails";

/**
 * @param {Object} props
 * @param {{
 *   id: string,
 *   name: string,
 *   description: string | null,
 *   price: number,
 *   calories: number | null,
 *   nutritional_info: Record<string, unknown>,
 *   is_available: boolean,
 * }} props.item
 */
export default function MenuItemCard({ item }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const priceLabel = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(item.price) || 0);

  const unavailable = item.is_available === false;

  return (
    <li className="border-b border-hairline pb-5 last:border-b-0 last:pb-0">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-4 text-left"
        onClick={() => setIsExpanded((open) => !open)}
        aria-expanded={isExpanded}
        aria-controls={`nutrition-${item.id}`}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={`font-semibold ${unavailable ? "text-ink-faint line-through" : "text-ink"}`}
            >
              {item.name}
            </h3>
            {item.calories !== null && item.calories !== undefined ? (
              <span className="rounded-full bg-tap-soft px-2 py-0.5 text-[11px] font-medium text-tap-dark">
                {item.calories} kcal
              </span>
            ) : null}
            {unavailable ? (
              <span className="rounded-full bg-brass-soft px-2 py-0.5 text-[11px] font-medium text-brass-dark">
                Unavailable
              </span>
            ) : null}
          </div>
          {item.description ? (
            <p className="mt-1 text-[14px] leading-[1.7] text-ink-muted">{item.description}</p>
          ) : null}
          <p className="mt-2 text-[12px] text-ink-faint">
            {isExpanded ? "Hide nutrition" : "Show nutrition"}
          </p>
        </div>
        <span className={`shrink-0 font-semibold ${unavailable ? "text-ink-faint" : "text-ink"}`}>
          {priceLabel}
        </span>
      </button>

      {isExpanded ? (
        <div
          id={`nutrition-${item.id}`}
          className="mt-4 rounded-2xl border border-hairline bg-porcelain/80 px-4 py-3"
        >
          <NutritionDetails
            calories={item.calories}
            nutritionalInfo={item.nutritional_info}
          />
        </div>
      ) : null}
    </li>
  );
}
