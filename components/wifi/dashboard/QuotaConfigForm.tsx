/**
 * Free-tier quota / speed policy form for enterprise Wi-Fi settings.
 * Presentational + controlled — parent owns persistence.
 */

import type { CSSProperties, FormEvent, ReactNode } from "react";

export interface QuotaPolicyValues {
  freeQuotaMb: number;
  freeSessionMinutes: number;
  defaultDownloadKbps: number;
  defaultUploadKbps: number;
  radiusCoaHost: string;
  radiusCoaPort: number;
}

export interface QuotaConfigFormProps {
  values: QuotaPolicyValues;
  onChange: (next: QuotaPolicyValues) => void;
  onSubmit: (values: QuotaPolicyValues) => void | Promise<void>;
  busy?: boolean;
  disabled?: boolean;
  notice?: string | null;
  className?: string;
  style?: CSSProperties;
}

function Field(props: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#12151a" }}>{props.label}</span>
      {props.children}
      {props.hint ? (
        <span style={{ fontSize: 12, color: "#9a9fa8", lineHeight: 1.4 }}>{props.hint}</span>
      ) : null}
    </label>
  );
}

const inputStyle: CSSProperties = {
  appearance: "none",
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #e7e4dd",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  fontFamily: 'var(--font-mono, "IBM Plex Mono", monospace)',
  background: "#fff",
  color: "#12151a",
};

export function QuotaConfigForm({
  values,
  onChange,
  onSubmit,
  busy = false,
  disabled = false,
  notice,
  className,
  style,
}: QuotaConfigFormProps) {
  const locked = busy || disabled;

  const set = <K extends keyof QuotaPolicyValues>(key: K, value: QuotaPolicyValues[K]) => {
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
        gap: 14,
        ...style,
      }}
    >
      <header>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 650 }}>Free-tier policy</h2>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "#5c6470", lineHeight: 1.45 }}>
          Applies to <strong>new</strong> guest authentications only. Active sessions keep their
          current quota and speed.
        </p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        <Field label="Free data (MB)" hint="0 allowed; guests get this ceiling on first join.">
          <input
            type="number"
            min={0}
            step={1}
            required
            disabled={locked}
            value={values.freeQuotaMb}
            onChange={(e) => set("freeQuotaMb", Number(e.target.value))}
            style={inputStyle}
          />
        </Field>
        <Field label="Session minutes" hint="Wall-clock duration before free access expires.">
          <input
            type="number"
            min={1}
            step={1}
            required
            disabled={locked}
            value={values.freeSessionMinutes}
            onChange={(e) => set("freeSessionMinutes", Number(e.target.value))}
            style={inputStyle}
          />
        </Field>
        <Field label="Download kbps" hint="0 = unlimited / AP default.">
          <input
            type="number"
            min={0}
            step={1}
            required
            disabled={locked}
            value={values.defaultDownloadKbps}
            onChange={(e) => set("defaultDownloadKbps", Number(e.target.value))}
            style={inputStyle}
          />
        </Field>
        <Field label="Upload kbps" hint="0 = unlimited / AP default.">
          <input
            type="number"
            min={0}
            step={1}
            required
            disabled={locked}
            value={values.defaultUploadKbps}
            onChange={(e) => set("defaultUploadKbps", Number(e.target.value))}
            style={inputStyle}
          />
        </Field>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 12,
        }}
      >
        <Field label="RADIUS CoA host" hint="Optional NAS address for Disconnect/CoA.">
          <input
            type="text"
            disabled={locked}
            value={values.radiusCoaHost}
            placeholder="192.168.1.1"
            onChange={(e) => set("radiusCoaHost", e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="CoA port">
          <input
            type="number"
            min={1}
            max={65535}
            disabled={locked}
            value={values.radiusCoaPort}
            onChange={(e) => set("radiusCoaPort", Number(e.target.value))}
            style={inputStyle}
          />
        </Field>
      </div>

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

      <button
        type="submit"
        disabled={locked}
        style={{
          appearance: "none",
          justifySelf: "start",
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
        {busy ? "Saving…" : "Save policy"}
      </button>
    </form>
  );
}

export default QuotaConfigForm;
