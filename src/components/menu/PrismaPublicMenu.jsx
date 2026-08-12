function MenuSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading menu">
      <div className="flex gap-2">
        <div className="h-9 w-20 animate-pulse rounded-full bg-hairline" />
        <div className="h-9 w-24 animate-pulse rounded-full bg-hairline" />
        <div className="h-9 w-20 animate-pulse rounded-full bg-hairline" />
      </div>
      {[0, 1, 2].map((section) => (
        <div key={section} className="rounded-3xl border border-hairline bg-surface p-6 sm:p-8">
          <div className="h-6 w-32 animate-pulse rounded bg-hairline" />
          <div className="mt-6 space-y-5">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex justify-between gap-4 border-b border-hairline pb-5 last:border-b-0">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 animate-pulse rounded bg-hairline" />
                  <div className="h-3 w-full max-w-md animate-pulse rounded bg-hairline" />
                </div>
                <div className="h-4 w-12 animate-pulse rounded bg-hairline" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PrismaPublicMenu({ data, loading, error }) {
  if (loading) {
    return <MenuSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-hairline bg-surface p-8" role="alert">
        <h2 className="font-display text-[22px] font-semibold">Menu unavailable</h2>
        <p className="mt-3 text-[15px] leading-[1.7] text-ink-muted">{error}</p>
      </div>
    );
  }

  const categories = data?.menu?.categories || [];
  const showChips = categories.length > 2;

  return (
    <div className="space-y-6">
      {showChips ? (
        <nav
          aria-label="Menu categories"
          className="flex gap-2 overflow-x-auto px-0 py-1"
        >
          {categories.map((category) => (
            <a
              key={category.id}
              href={`#menu-cat-${category.id}`}
              className="shrink-0 rounded-full border border-hairline bg-surface px-3 py-1.5 text-[13px] font-medium text-ink-muted hover:border-hairline-strong hover:text-ink"
            >
              {category.title}
            </a>
          ))}
        </nav>
      ) : null}

      {categories.map((category) => (
        <section
          key={category.id}
          id={`menu-cat-${category.id}`}
          className="scroll-mt-[calc(var(--demo-chrome-h,3.5rem)+4.5rem)] rounded-3xl border border-hairline bg-surface p-6 sm:p-8"
        >
          <h2 className="font-display text-[22px] font-semibold">{category.title}</h2>
          {category.description ? (
            <p className="mt-2 text-[14px] leading-[1.7] text-ink-muted">{category.description}</p>
          ) : null}
          <ul className="mt-6 space-y-5">
            {category.items.map((item) => {
              const soldOut = item.isAvailable === false;
              return (
                <li
                  key={item.id}
                  className={`border-b border-hairline pb-5 last:border-b-0 last:pb-0 ${soldOut ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={`font-semibold text-ink ${soldOut ? "line-through" : ""}`}>{item.name}</h3>
                        {item.badge ? (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              soldOut
                                ? "bg-porcelain text-ink-muted"
                                : "bg-brass-soft text-brass-dark"
                            }`}
                          >
                            {item.badge}
                          </span>
                        ) : null}
                      </div>
                      {item.description ? (
                        <p className="mt-1 text-[14px] leading-[1.7] text-ink-muted">{item.description}</p>
                      ) : null}
                      {item.allergens?.length ? (
                        <p className="mt-2 text-[12px] text-ink-faint">Allergens: {item.allergens.join(", ")}</p>
                      ) : null}
                    </div>
                    <span className={`shrink-0 font-semibold text-ink ${soldOut ? "line-through" : ""}`}>
                      {item.price}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
