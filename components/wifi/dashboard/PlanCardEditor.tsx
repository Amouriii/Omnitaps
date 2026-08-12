/**
 * Create / edit subscription plan card for enterprise Wi-Fi admin.
 */

import type { CSSProperties, FormEvent, ReactNode } from "react";

export interface PlanEditorValues {
  id?: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  interval: "session" | "hourly" | "daily" | "monthly";
  quotaMb: number | null;
  durationMinutes: number | null;
  downloadKbps: number;
  uploadKbps: number;
  sortOrder: number;
  stripePriceId: string;
  isActive: boolean;
}

export interface PlanCardEditorProps {
  values: PlanEditorValues;
  onChange: (next: PlanEditorValues) => void;
  onSubmit: (values: PlanEditorValues) => void | Promise<void>;
  onCancel?: () => void;
  onDeactivate?: (values: PlanEditorValues) => void | Promise<void>;
  mode?: "create" | "edit";
  busy?: boolean;
  disabled?: boolean;
  notice?: string | null;
  className?: string;
  style?: CSSProperties;
}

const INTERVALS: PlanEditorValues["interval"][] = ["session", "hourly", "daily", "monthly"];

const inputStyle: CSSProperties = {
  appearance: "none",
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #e7e4dd",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  fontFamily: 'var(--font-body, "Instrument Sans", system-ui, sans-serif)',
  background: "#fff",
  color: "#12151a",
};

function Field(props: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{props.label}</span>
      {props.children}
      {props.hint ? (
        <span style={{ fontSize: 12, color: "#9a9fa8", lineHeight: 1.4 }}>{props.hint}</span>
      ) : null}
    </label>
  );
}

export function emptyPlanValues(sortOrder = 0): PlanEditorValues {
  return {
    name: "",
    description: "",
    priceCents: 499,
    currency: "usd",
    interval: "session",
    quotaMb: 1024,
    durationMinutes: 240,
    downloadKbps: 20000,
    uploadKbps: 5000,
    sortOrder,
    stripePriceId: "",
    isActive: true,
  };
}

export function PlanCardEditor({
  values,
  onChange,
  onSubmit,
  onCancel,
  onDeactivate,
  mode = "create",
  busy = false,
  disabled = false,
  notice,
  className,
  style,
}: PlanCardEditorProps) {
  const locked = busy || disabled;

  const set = <K extends keyof PlanEditorValues>(key: K, value: PlanEditorValues[K]) => {
    onChange({ ...values, [key]: value });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (locked) return;
    void onSubmit(values);
  };

  return (
    <form
      className={className}
      onSubmit={handleSubmit}
      style={{
        background: "#fff",
        border: "1px solid #e7e4dd",
        borderRadius: 16,
        padding: 18,
        display: "grid",
        gap: 12,
        ...style,
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 650 }}>
            {mode === "create" ? "New plan" : "Edit plan"}
          </h3>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#5c6470" }}>
            Changes apply to future checkouts — live sessions keep current entitlements.
          </p>
        </div>
        {mode === "edit" ? (
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: "#5c6470",
            }}
          >
            <input
              type="checkbox"
              checked={values.isActive}
              disabled={locked}
              onChange={(e) => set("isActive", e.target.checked)}
            />
            Active
          </label>
        ) : null}
      </header>

      <Field label="Name">
        <input
          required
          disabled={locked}
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          style={inputStyle}
          placeholder="Day Pass"
        />
      </Field>

      <Field label="Description">
        <textarea
          disabled={locked}
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          rows={2}
          style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
          placeholder="Extra data and faster speeds for visitors."
        />
      </Field>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
        }}
      >
        <Field label="Price (cents)" hint="e.g. 499 = $4.99">
          <input
            type="number"
            min={0}
            required
            disabled={locked}
            value={values.priceCents}
            onChange={(e) => set("priceCents", Number(e.target.value))}
            style={{ ...inputStyle, fontFamily: 'var(--font-mono, "IBM Plex Mono", monospace)' }}
          />
        </Field>
        <Field label="Currency">
          <input
            required
            disabled={locked}
            value={values.currency}
            onChange={(e) => set("currency", e.target.value.toLowerCase())}
            style={inputStyle}
            maxLength={3}
          />
        </Field>
        <Field label="Interval">
          <select
            disabled={locked}
            value={values.interval}
            onChange={(e) => set("interval", e.target.value as PlanEditorValues["interval"])}
            style={inputStyle}
          >
            {INTERVALS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sort order">
          <input
            type="number"
            min={0}
            disabled={locked}
            value={values.sortOrder}
            onChange={(e) => set("sortOrder", Number(e.target.value))}
            style={{ ...inputStyle, fontFamily: 'var(--font-mono, "IBM Plex Mono", monospace)' }}
          />
        </Field>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
        }}
      >
        <Field label="Quota MB" hint="Leave empty for unlimited.">
          <input
            type="number"
            min={0}
            disabled={locked}
            value={values.quotaMb ?? ""}
            onChange={(e) =>
              set("quotaMb", e.target.value === "" ? null : Number(e.target.value))
            }
            style={{ ...inputStyle, fontFamily: 'var(--font-mono, "IBM Plex Mono", monospace)' }}
          />
        </Field>
        <Field label="Duration minutes" hint="Leave empty for no time cap.">
          <input
            type="number"
            min={1}
            disabled={locked}
            value={values.durationMinutes ?? ""}
            onChange={(e) =>
              set(
                "durationMinutes",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
            style={{ ...inputStyle, fontFamily: 'var(--font-mono, "IBM Plex Mono", monospace)' }}
          />
        </Field>
        <Field label="Download kbps">
          <input
            type="number"
            min={0}
            disabled={locked}
            value={values.downloadKbps}
            onChange={(e) => set("downloadKbps", Number(e.target.value))}
            style={{ ...inputStyle, fontFamily: 'var(--font-mono, "IBM Plex Mono", monospace)' }}
          />
        </Field>
        <Field label="Upload kbps">
          <input
            type="number"
            min={0}
            disabled={locked}
            value={values.uploadKbps}
            onChange={(e) => set("uploadKbps", Number(e.target.value))}
            style={{ ...inputStyle, fontFamily: 'var(--font-mono, "IBM Plex Mono", monospace)' }}
          />
        </Field>
      </div>

      <Field label="Stripe Price ID" hint="Optional — otherwise Checkout uses price_data.">
        <input
          disabled={locked}
          value={values.stripePriceId}
          onChange={(e) => set("stripePriceId", e.target.value)}
          style={{ ...inputStyle, fontFamily: 'var(--font-mono, "IBM Plex Mono", monospace)' }}
          placeholder="price_…"
        />
      </Field>

      {notice ? (
        <p
          role="status"
          style={{
            margin: 0,
            padding: "10px 12px",
            borderRadius: 10,
            background: "#eaf0fe",
            color: "#0e3fb0",
            fontSize: 13,
          }}
        >
          {notice}
        </p>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button
          type="submit"
          disabled={locked}
          style={{
            appearance: "none",
            border: "none",
            borderRadius: 999,
            background: locked ? "#d8d4ca" : "#155eef",
            color: "#fff",
            fontWeight: 600,
            fontSize: 14,
            padding: "11px 18px",
            cursor: locked ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "Saving…" : mode === "create" ? "Create plan" : "Save plan"}
        </button>
        {onCancel ? (
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            style={{
              appearance: "none",
              border: "1px solid #e7e4dd",
              borderRadius: 999,
              background: "#fff",
              color: "#12151a",
              fontWeight: 600,
              fontSize: 14,
              padding: "11px 18px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        ) : null}
        {mode === "edit" && onDeactivate && values.isActive ? (
          <button
            type="button"
            disabled={locked}
            onClick={() => void onDeactivate(values)}
            style={{
              appearance: "none",
              border: "1px solid #f3d4d4",
              borderRadius: 999,
              background: "#fff5f5",
              color: "#c24141",
              fontWeight: 600,
              fontSize: 14,
              padding: "11px 18px",
              cursor: locked ? "not-allowed" : "pointer",
              marginLeft: "auto",
            }}
          >
            Deactivate
          </button>
        ) : null}
      </div>
    </form>
  );
}

export default PlanCardEditor;
