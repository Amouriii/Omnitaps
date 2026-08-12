import { useLiveMenu } from "../../hooks/useLiveMenu";
import MenuItemCard from "./MenuItemCard";

/**
 * @param {Object} props
 * @param {string} props.restaurantId enterprise UUID
 * @param {string} [props.title]
 */
export default function PublicMenu({ restaurantId, title = "Menu" }) {
  const { items, loading, error } = useLiveMenu(restaurantId);

  if (loading) {
    return (
      <p className="rounded-3xl border border-hairline bg-surface p-8 text-ink-muted" role="status">
        Loading menu…
      </p>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-hairline bg-surface p-8" role="alert">
        <h2 className="font-display text-[22px] font-semibold">Menu unavailable</h2>
        <p className="mt-3 text-[15px] leading-[1.7] text-ink-muted">{error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-hairline bg-surface p-8">
        <h2 className="font-display text-[22px] font-semibold">{title}</h2>
        <p className="mt-3 text-[15px] leading-[1.7] text-ink-muted">
          No dishes on this menu yet. Check back soon.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-hairline bg-surface p-6 sm:p-8">
      <h2 className="font-display text-[22px] font-semibold">{title}</h2>
      <p className="mt-2 text-[13px] text-ink-faint">Updates live as the kitchen makes changes.</p>
      <ul className="mt-6 space-y-5">
        {items.map((item) => (
          <MenuItemCard key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}
