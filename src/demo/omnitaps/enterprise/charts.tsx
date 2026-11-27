import { useId } from "react";
import { formatMoney } from "../time";
import type { PeakHourPoint, TrendPoint } from "../types";

export type TrendMetric = "bookings" | "guests" | "revenue";

function metricValue(point: TrendPoint, metric: TrendMetric): number {
  if (metric === "bookings") return point.bookings;
  if (metric === "guests") return point.guests;
  return point.revenueCents;
}

function formatMetric(value: number, metric: TrendMetric): string {
  if (metric === "revenue") return formatMoney(value, { compact: true });
  return String(Math.round(value));
}

export function TrendChart({
  data,
  metric,
  height = 190,
}: {
  data: TrendPoint[];
  metric: TrendMetric;
  height?: number;
}) {
  const rawId = useId();
  const gradientId = `ot-trend-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const width = 660;
  const padX = 34;
  const padTop = 18;
  const padBottom = 30;
  const values = data.map((point) => metricValue(point, metric));
  const max = Math.max(...values, 1);
  const plotWidth = width - padX * 2;
  const plotHeight = height - padTop - padBottom;
  const points = data.map((point, index) => {
    const value = metricValue(point, metric);
    const x = padX + (data.length <= 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth);
    const y = padTop + plotHeight - (value / max) * plotHeight;
    return { x, y, value, label: point.label };
  });
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(" ");
  const first = points[0];
  const last = points[points.length - 1];
  const areaPath =
    first && last
      ? `${linePath} L${last.x.toFixed(2)},${(padTop + plotHeight).toFixed(2)} L${first.x.toFixed(2)},${(padTop + plotHeight).toFixed(2)} Z`
      : "";
  const labelIndexes = [0, Math.floor((data.length - 1) / 2), data.length - 1].filter(
    (value, index, source) => value >= 0 && source.indexOf(value) === index,
  );

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label={`${metric} trend over the last ${data.length} days`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-tap)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--color-tap)" stopOpacity="0.015" />
        </linearGradient>
      </defs>

      {[0, 0.5, 1].map((ratio) => {
        const y = padTop + plotHeight * ratio;
        return (
          <line
            key={ratio}
            x1={padX}
            x2={width - padX}
            y1={y}
            y2={y}
            stroke="var(--color-hairline)"
            strokeDasharray={ratio === 1 ? undefined : "3 5"}
          />
        );
      })}

      <text x={padX} y={padTop - 5} fill="var(--color-ink-faint)" fontSize="9" fontFamily="IBM Plex Mono">
        {formatMetric(max, metric)}
      </text>
      <text
        x={padX}
        y={padTop + plotHeight + 14}
        fill="var(--color-ink-faint)"
        fontSize="9"
        fontFamily="IBM Plex Mono"
      >
        0
      </text>

      {areaPath ? <path d={areaPath} fill={`url(#${gradientId})`} /> : null}
      {linePath ? (
        <path
          d={linePath}
          fill="none"
          stroke="var(--color-tap)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}

      {points.map((point, index) => (
        <g key={`${point.label}-${index}`}>
          <circle
            cx={point.x}
            cy={point.y}
            r={index === points.length - 1 ? 3.6 : 2.4}
            fill="var(--color-surface)"
            stroke="var(--color-tap)"
            strokeWidth="1.8"
          >
            <title>{`${point.label}: ${formatMetric(point.value, metric)}`}</title>
          </circle>
        </g>
      ))}

      {labelIndexes.map((index) => {
        const point = points[index];
        if (!point) return null;
        return (
          <text
            key={`label-${index}`}
            x={point.x}
            y={height - 8}
            textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
            fill="var(--color-ink-faint)"
            fontSize="9"
            fontFamily="IBM Plex Mono"
          >
            {point.label}
          </text>
        );
      })}
    </svg>
  );
}

export function PeakHoursChart({ data }: { data: PeakHourPoint[] }) {
  const max = Math.max(...data.map((point) => point.covers), 1);
  return (
    <div>
      <div className="flex h-[150px] items-end gap-1" role="img" aria-label="Guest demand by hour">
        {data.map((point) => {
          const ratio = point.covers / max;
          return (
            <div key={point.hour} className="group flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span className="font-mono text-[8px] tabular-nums text-ink-faint opacity-0 transition group-hover:opacity-100">
                {point.covers}
              </span>
              <div
                className="w-full rounded-t-[3px] bg-tap/75 transition-all duration-300 group-hover:bg-tap"
                style={{ height: `${Math.max(ratio * 118, point.covers > 0 ? 5 : 2)}px` }}
                title={`${point.label} · ${point.covers} covers · ${point.bookings} bookings`}
              />
              <span className="font-mono text-[8px] tabular-nums text-ink-faint">
                {point.hour % 2 === 0 ? point.hour : ""}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.1em] text-ink-faint">
        <span>11:00</span>
        <span>Guest demand · covers</span>
        <span>22:00</span>
      </div>
    </div>
  );
}
