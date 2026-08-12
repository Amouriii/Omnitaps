import { useEffect, useId, useState } from "react";
import Modal from "../Modal";
import { createQrMenuItem } from "../../services/qrMenuService";

const EMPTY_FORM = {
  name: "",
  price: "",
  calories: "",
  description: "",
  protein: "",
  carbs: "",
  fat: "",
  allergens: "",
};

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.restaurantId
 * @param {(item: object) => void} [props.onCreated]
 */
export default function AddMenuItemModal({ open, onClose, restaurantId, onCreated }) {
  const formId = useId();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY_FORM);
    setError("");
    setSubmitting(false);
  }, [open]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError("");

    const nutritional_info = {};
    if (form.protein.trim()) nutritional_info.protein = form.protein.trim();
    if (form.carbs.trim()) nutritional_info.carbs = form.carbs.trim();
    if (form.fat.trim()) nutritional_info.fat = form.fat.trim();
    if (form.allergens.trim()) {
      nutritional_info.allergens = form.allergens
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
    }

    try {
      const item = await createQrMenuItem({
        restaurant_id: restaurantId,
        name: form.name,
        description: form.description,
        price: Number(form.price),
        calories: form.calories === "" ? null : Number(form.calories),
        nutritional_info,
        is_available: true,
      });
      onCreated?.(item);
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add menu item.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add menu item">
      <form id={formId} className="space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-[13px] font-medium text-ink">Name</span>
          <input
            required
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-hairline bg-porcelain px-3 py-2.5 text-[14px] text-ink"
            placeholder="House salad"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[13px] font-medium text-ink">Price (USD)</span>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => updateField("price", e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-hairline bg-porcelain px-3 py-2.5 text-[14px] text-ink"
              placeholder="12.50"
            />
          </label>
          <label className="block">
            <span className="text-[13px] font-medium text-ink">Calories</span>
            <input
              type="number"
              min="0"
              step="1"
              value={form.calories}
              onChange={(e) => updateField("calories", e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-hairline bg-porcelain px-3 py-2.5 text-[14px] text-ink"
              placeholder="320"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-[13px] font-medium text-ink">Description</span>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-hairline bg-porcelain px-3 py-2.5 text-[14px] text-ink"
            placeholder="Short guest-facing description"
          />
        </label>

        <fieldset className="space-y-3 rounded-2xl border border-hairline bg-porcelain/70 p-4">
          <legend className="px-1 text-[13px] font-medium text-ink">Nutrition macros</legend>
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="text-[12px] text-ink-muted">Protein</span>
              <input
                value={form.protein}
                onChange={(e) => updateField("protein", e.target.value)}
                className="mt-1 w-full rounded-xl border border-hairline bg-surface px-3 py-2 text-[14px]"
                placeholder="18g"
              />
            </label>
            <label className="block">
              <span className="text-[12px] text-ink-muted">Carbs</span>
              <input
                value={form.carbs}
                onChange={(e) => updateField("carbs", e.target.value)}
                className="mt-1 w-full rounded-xl border border-hairline bg-surface px-3 py-2 text-[14px]"
                placeholder="22g"
              />
            </label>
            <label className="block">
              <span className="text-[12px] text-ink-muted">Fat</span>
              <input
                value={form.fat}
                onChange={(e) => updateField("fat", e.target.value)}
                className="mt-1 w-full rounded-xl border border-hairline bg-surface px-3 py-2 text-[14px]"
                placeholder="9g"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-[12px] text-ink-muted">Allergens (comma-separated)</span>
            <input
              value={form.allergens}
              onChange={(e) => updateField("allergens", e.target.value)}
              className="mt-1 w-full rounded-xl border border-hairline bg-surface px-3 py-2 text-[14px]"
              placeholder="gluten, dairy"
            />
          </label>
        </fieldset>

        {error ? (
          <p className="text-[13px] text-brass-dark" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-hairline px-4 py-2.5 text-[13px] font-medium text-ink-muted hover:border-hairline-strong hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !restaurantId}
            className="rounded-xl bg-tap px-4 py-2.5 text-[13px] font-medium text-white hover:bg-tap-dark disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Add item"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
