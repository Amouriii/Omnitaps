/**
 * Bandwidth / throughput chart for enterprise Wi-Fi telemetry.
 * Pure SVG — no Tremor/chart library dependency.
 */

import type { CSSProperties } from "react";

export interface BandwidthPoint {
  hour: string;
  inputBytes: number;
  outputBytes: number;
  totalBytes: number;
  sessionCount: number;
}

export interface BandwidthChartProps {
  points: BandwidthPoint[];
  height?: number;
  loading?: boolean;
  className?: string;
  style?: CSSProperties;
}

function formatBytesShort(bytes: number): string {
  const safe = Math.max(0, bytes);
  if (safe >= 1024 ** 3) return `${(safe / 1024 ** 3).toFixed(1)}G`;
  if (safe >= 1024 ** 2) return `${(safe / 1024 ** 2).toFixed(0)}M`;
  if (safe >= 1024) return `${(safe / 1024).toFixed(0)}K`;
  return `${safe}`;
}

function formatHourLabel(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function BandwidthChart({
  points,
  height = 220,
  loading = false,
  className,
  style,
}: BandwidthChartProps) {
  const width = 640;
  const padding = { top: 16, right: 12, bottom: 28, left: 44 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const totals = points.map((p) => p.totalBytes);
  const maxY = Math.max(1, ...totals);
  const n = Math.max(1, points.length - 1);

  const coords = points.map((point, index) => {
    const x = padding.left + (points.length <= 1 ? innerW / 2 : (index / n) * innerW);
    const y = padding.top + innerH - (point.totalBytes / maxY) * innerH;
    return { x, y, point };
  });

  const linePath = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`)
    .join(" ");

  const areaPath =
    coords.length === 0
      ? ""
      : `${linePath} L ${coords[coords.length - 1].x.toFixed(2)} ${(padding.top + innerH).toFixed(
          2,
        )} L ${coords[0].x.toFixed(2)} ${(padding.top + innerH).toFixed(2)} Z`;

  const labelIndexes =
    points.length <= 6
      ? points.map((_, i) => i)
      : [0, Math.floor(points.length / 2), points.length - 1];

  return (
    <div
      className={className}
      style={{
        background: "#fff",
        border: "1px solid #e7e4dd",
        borderRadius: 16,
        padding: "14px 16px 10px",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
          marginBottom: 8,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 650 }}>Throughput</h2>
        <span style={{ fontSize: 12, color: "#9a9fa8" }}>
          {loading ? "Refreshing…" : "Bytes by session start hour"}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label="Bandwidth usage over time"
      >
        {[0, 0.5, 1].map((frac) => {
          const y = padding.top + innerH * (1 - frac);
          return (
            <g key={frac}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke="#eeeae2"
                strokeWidth={1}
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                fill="#9a9fa8"
                fontSize={10}
                fontFamily='var(--font-mono, "IBM Plex Mono", monospace)'
              >
                {formatBytesShort(maxY * frac)}
              </text>
            </g>
          );
        })}

        {areaPath ? (
          <path d={areaPath} fill="rgba(21, 94, 239, 0.12)" stroke="none" />
        ) : null}
        {linePath ? (
          <path
            d={linePath}
            fill="none"
            stroke="#155eef"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}

        {coords.map((c) => (
          <circle
            key={c.point.hour}
            cx={c.x}
            cy={c.y}
            r={points.length > 48 ? 0 : 2.5}
            fill="#155eef"
          />
        ))}

        {labelIndexes.map((index) => {
          const c = coords[index];
          if (!c) return null;
          return (
            <text
              key={`label-${c.point.hour}`}
              x={c.x}
              y={height - 8}
              textAnchor="middle"
              fill="#9a9fa8"
              fontSize={10}
              fontFamily='var(--font-mono, "IBM Plex Mono", monospace)'
            >
              {formatHourLabel(c.point.hour)}
            </text>
          );
        })}
      </svg>

      {!loading && points.every((p) => p.totalBytes === 0) ? (
        <p style={{ margin: "0 0 6px", textAlign: "center", color: "#9a9fa8", fontSize: 13 }}>
          No session traffic in this window yet.
        </p>
      ) : null}
    </div>
  );
}

export default BandwidthChart;
