/**
 * Renders calories and nutritional_info key/value pairs for a QR menu item.
 */

const PREFERRED_ORDER = ["protein", "carbs", "fat", "allergens", "fiber", "sugar", "sodium"];

/**
 * @param {Object} props
 * @param {number | null | undefined} props.calories
 * @param {Record<string, unknown> | null | undefined} props.nutritionalInfo
 */
export default function NutritionDetails({ calories, nutritionalInfo }) {
  const info =
    nutritionalInfo && typeof nutritionalInfo === "object" && !Array.isArray(nutritionalInfo)
      ? nutritionalInfo
      : {};

  const keys = Object.keys(info).sort((a, b) => {
    const ai = PREFERRED_ORDER.indexOf(a.toLowerCase());
    const bi = PREFERRED_ORDER.indexOf(b.toLowerCase());
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  const hasCalories = calories !== null && calories !== undefined && !Number.isNaN(Number(calories));
  const hasMacros = keys.length > 0;

  if (!hasCalories && !hasMacros) {
    return (
      <p className="text-[13px] text-ink-faint">No nutrition details listed.</p>
    );
  }

  return (
    <div className="space-y-3" aria-label="Nutrition details">
      {hasCalories ? (
        <p className="text-[13px] text-ink-muted">
          <span className="font-medium text-ink">Calories:</span> {Number(calories)} kcal
        </p>
      ) : null}
      {hasMacros ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          {keys.map((key) => {
            const raw = info[key];
            const display =
              raw === null || raw === undefined
                ? "—"
                : Array.isArray(raw)
                  ? raw.map(String).join(", ")
                  : String(raw);

            return (
              <div key={key}>
                <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                  {key.replace(/_/g, " ")}
                </dt>
                <dd className="mt-0.5 text-[13px] text-ink">{display}</dd>
              </div>
            );
          })}
        </dl>
      ) : null}
    </div>
  );
}
