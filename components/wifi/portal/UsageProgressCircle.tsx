/**
 * Guest captive-portal usage ring.
 * Pure presentational SVG — no framework router deps.
 */

import type { CSSProperties } from "react";

export interface UsageProgressCircleProps {
  /** 0–100 consumed */
  percentUsed: number;
  remainingMb?: number | null;
  remainingSeconds?: number | null;
  /** Outer diameter in px */
  size?: number;
  /** Stroke width in px */
  strokeWidth?: number;
  label?: string;
  exhausted?: boolean;
  className?: string;
  style?: CSSProperties;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function formatRemainingTime(seconds: number | null | undefined): string | null {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) {
    return null;
  }
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs.toString().padStart(2, "0")}s`;
  }
  return `${secs}s`;
}

function formatRemainingMb(mb: number | null | undefined): string | null {
  if (mb === null || mb === undefined || !Number.isFinite(mb)) {
    return null;
  }
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(mb >= 10240 ? 0 : 1)} GB left`;
  }
  if (mb >= 10) {
    return `${Math.round(mb)} MB left`;
  }
  return `${mb.toFixed(1)} MB left`;
}

export function UsageProgressCircle({
  percentUsed,
  remainingMb,
  remainingSeconds,
  size = 168,
  strokeWidth = 12,
  label = "Data used",
  exhausted = false,
  className,
  style,
}: UsageProgressCircleProps) {
  const percent = clampPercent(percentUsed);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - percent / 100);
  const timeLabel = formatRemainingTime(remainingSeconds ?? null);
  const dataLabel = formatRemainingMb(remainingMb ?? null);

  const trackColor = exhausted ? "#f3d4d4" : "#e7e4dd";
  const progressColor = exhausted ? "#c24141" : percent >= 90 ? "#b8873b" : "#155eef";

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: size,
        height: size,
        marginInline: "auto",
        ...style,
      }}
      role="img"
      aria-label={`${label}: ${Math.round(percent)} percent used${
        dataLabel ? `, ${dataLabel}` : ""
      }${timeLabel ? `, ${timeLabel} remaining` : ""}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            transition: "stroke-dashoffset 600ms ease, stroke 300ms ease",
          }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: strokeWidth + 4,
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono, "IBM Plex Mono", monospace)',
            fontSize: size * 0.18,
            fontWeight: 500,
            lineHeight: 1,
            color: exhausted ? "#c24141" : "#12151a",
          }}
        >
          {Math.round(percent)}%
        </span>
        <span
          style={{
            marginTop: 6,
            fontSize: Math.max(11, size * 0.07),
            color: "#5c6470",
            letterSpacing: "0.02em",
          }}
        >
          {exhausted ? "Exhausted" : label}
        </span>
        {dataLabel ? (
          <span
            style={{
              marginTop: 4,
              fontSize: Math.max(10, size * 0.065),
              color: "#9a9fa8",
            }}
          >
            {dataLabel}
          </span>
        ) : null}
        {timeLabel ? (
          <span
            style={{
              marginTop: 2,
              fontSize: Math.max(10, size * 0.065),
              color: "#9a9fa8",
              fontFamily: 'var(--font-mono, "IBM Plex Mono", monospace)',
            }}
          >
            {timeLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default UsageProgressCircle;
