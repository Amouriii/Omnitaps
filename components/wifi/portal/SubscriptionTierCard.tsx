/**
 * Subscription tier card for captive portal upgrades.
 * Presentational — parent handles Stripe checkout create.
 */

import type { CSSProperties, ReactNode } from "react";

export interface SubscriptionTierPlan {
  id: string;
  name: string;
  description?: string | null;
  priceCents: number;
  currency: string;
  interval: string;
  quotaMb?: number | null;
  durationMinutes?: number | null;
  downloadKbps?: number;
  uploadKbps?: number;
}

export interface SubscriptionTierCardProps {
  plan: SubscriptionTierPlan;
  selected?: boolean;
  busy?: boolean;
  disabled?: boolean;
  badge?: string;
  ctaLabel?: string;
  onSelect?: (plan: SubscriptionTierPlan) => void;
  className?: string;
  style?: CSSProperties;
}

function formatPrice(cents: number, currency: string): string {
  const amount = Math.max(0, cents) / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
  }
}

function formatQuota(mb: number | null | undefined): string {
  if (mb === null || mb === undefined) return "Unlimited data";
  if (mb >= 1024) {
    const gb = mb / 1024;
    return `${gb >= 10 ? Math.round(gb) : gb.toFixed(1)} GB`;
  }
  return `${mb} MB`;
}

function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "No time limit";
  if (minutes >= 1440) {
    const days = minutes / 1440;
    return `${days % 1 === 0 ? days : days.toFixed(1)} day${days === 1 ? "" : "s"}`;
  }
  if (minutes >= 60) {
    const hours = minutes / 60;
    return `${hours % 1 === 0 ? hours : hours.toFixed(1)} hour${hours === 1 ? "" : "s"}`;
  }
  return `${minutes} min`;
}

function formatSpeed(kbps: number | undefined): string | null {
  if (!kbps || kbps <= 0) return null;
  if (kbps >= 1000) {
    const mbps = kbps / 1000;
    return `${mbps % 1 === 0 ? mbps : mbps.toFixed(1)} Mbps`;
  }
  return `${kbps} kbps`;
}

function Feature({ children }: { children: ReactNode }) {
  return (
    <li
      style={{
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
        fontSize: 13,
        color: "#5c6470",
        lineHeight: 1.4,
      }}
    >
      <span aria-hidden="true" style={{ color: "#155eef", fontWeight: 700 }}>
        ·
      </span>
      <span>{children}</span>
    </li>
  );
}

export function SubscriptionTierCard({
  plan,
  selected = false,
  busy = false,
  disabled = false,
  badge,
  ctaLabel = "Upgrade",
  onSelect,
  className,
  style,
}: SubscriptionTierCardProps) {
  const down = formatSpeed(plan.downloadKbps);
  const up = formatSpeed(plan.uploadKbps);
  const isDisabled = disabled || busy;

  return (
    <article
      className={className}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: "18px 16px",
        borderRadius: 16,
        background: "#fff",
        border: selected ? "2px solid #155eef" : "1px solid #e7e4dd",
        boxShadow: selected ? "0 8px 24px rgba(21, 94, 239, 0.12)" : "none",
        transition: "border-color 180ms ease, box-shadow 180ms ease",
        ...style,
      }}
    >
      {badge ? (
        <span
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            fontSize: 11,
            fontWeight: 650,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "#8f6726",
            background: "#f6eede",
            borderRadius: 999,
            padding: "4px 8px",
          }}
        >
          {badge}
        </span>
      ) : null}

      <header>
        <h3
          style={{
            margin: 0,
            fontSize: 17,
            fontWeight: 650,
            letterSpacing: "-0.01em",
            color: "#12151a",
            paddingRight: badge ? 72 : 0,
          }}
        >
          {plan.name}
        </h3>
        {plan.description ? (
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#5c6470", lineHeight: 1.45 }}>
            {plan.description}
          </p>
        ) : null}
      </header>

      <p style={{ margin: 0 }}>
        <span
          style={{
            fontFamily: 'var(--font-mono, "IBM Plex Mono", monospace)',
            fontSize: 26,
            fontWeight: 500,
            color: "#12151a",
            letterSpacing: "-0.02em",
          }}
        >
          {formatPrice(plan.priceCents, plan.currency)}
        </span>
        <span style={{ marginLeft: 6, fontSize: 13, color: "#9a9fa8" }}>
          / {plan.interval}
        </span>
      </p>

      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
        <Feature>{formatQuota(plan.quotaMb)} data</Feature>
        <Feature>{formatDuration(plan.durationMinutes)}</Feature>
        {down ? <Feature>Down {down}</Feature> : null}
        {up ? <Feature>Up {up}</Feature> : null}
      </ul>

      <button
        type="button"
        disabled={isDisabled}
        onClick={() => onSelect?.(plan)}
        style={{
          appearance: "none",
          marginTop: "auto",
          border: "none",
          borderRadius: 999,
          background: isDisabled ? "#d8d4ca" : selected ? "#0e3fb0" : "#155eef",
          color: "#fff",
          fontWeight: 600,
          fontSize: 14,
          padding: "12px 16px",
          cursor: isDisabled ? "not-allowed" : "pointer",
          opacity: busy ? 0.85 : 1,
        }}
      >
        {busy ? "Starting checkout…" : ctaLabel}
      </button>
    </article>
  );
}

export default SubscriptionTierCard;
