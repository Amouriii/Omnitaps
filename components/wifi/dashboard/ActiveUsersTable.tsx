/**
 * Active guest sessions table for enterprise Wi-Fi dashboard.
 */

import type { CSSProperties } from "react";

export interface ActiveUserRow {
  sessionId: string;
  deviceId: string;
  macAddress: string;
  status: string;
  startedAt: string;
  endsAt: string | null;
  usedBytes: number;
  quotaBytes: number;
  downloadKbps: number;
  uploadKbps: number;
  planName: string | null;
}

export interface ActiveUsersTableProps {
  rows: ActiveUserRow[];
  loading?: boolean;
  emptyLabel?: string;
  className?: string;
  style?: CSSProperties;
}

function formatBytes(bytes: number): string {
  const safe = Math.max(0, bytes);
  if (safe >= 1024 ** 3) return `${(safe / 1024 ** 3).toFixed(2)} GB`;
  if (safe >= 1024 ** 2) return `${(safe / 1024 ** 2).toFixed(1)} MB`;
  if (safe >= 1024) return `${(safe / 1024).toFixed(0)} KB`;
  return `${safe} B`;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function quotaPct(used: number, quota: number): number {
  if (!quota || quota <= 0) return 0;
  return Math.min(100, Math.round((used / quota) * 100));
}

export function ActiveUsersTable({
  rows,
  loading = false,
  emptyLabel = "No active sessions right now.",
  className,
  style,
}: ActiveUsersTableProps) {
  return (
    <div
      className={className}
      style={{
        background: "#fff",
        border: "1px solid #e7e4dd",
        borderRadius: 16,
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid #e7e4dd",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 650 }}>Active users</h2>
        <span style={{ fontSize: 12, color: "#9a9fa8" }}>
          {loading ? "Refreshing…" : `${rows.length} connected`}
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
            minWidth: 640,
          }}
        >
          <thead>
            <tr style={{ textAlign: "left", color: "#9a9fa8" }}>
              <th style={thStyle}>MAC</th>
              <th style={thStyle}>Plan</th>
              <th style={thStyle}>Usage</th>
              <th style={thStyle}>Speed</th>
              <th style={thStyle}>Started</th>
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "28px 16px", color: "#5c6470", textAlign: "center" }}>
                  {emptyLabel}
                </td>
              </tr>
            ) : null}
            {rows.map((row) => {
              const pct = quotaPct(row.usedBytes, row.quotaBytes);
              return (
                <tr key={row.sessionId} style={{ borderTop: "1px solid #f0eee8" }}>
                  <td style={tdStyle}>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono, "IBM Plex Mono", monospace)',
                        fontSize: 12,
                      }}
                    >
                      {row.macAddress || "—"}
                    </div>
                    <div style={{ color: "#9a9fa8", fontSize: 11, marginTop: 2 }}>
                      {row.status}
                    </div>
                  </td>
                  <td style={tdStyle}>{row.planName || "Free"}</td>
                  <td style={tdStyle}>
                    <div>{formatBytes(row.usedBytes)}</div>
                    <div
                      style={{
                        marginTop: 6,
                        height: 4,
                        borderRadius: 999,
                        background: "#eeeae2",
                        overflow: "hidden",
                        maxWidth: 120,
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          background: pct >= 90 ? "#c24141" : "#155eef",
                        }}
                      />
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontFamily: 'var(--font-mono, "IBM Plex Mono", monospace)' }}>
                      ↓{row.downloadKbps}/{row.uploadKbps}↑
                    </span>
                    <span style={{ color: "#9a9fa8" }}> kbps</span>
                  </td>
                  <td style={tdStyle}>{formatWhen(row.startedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle: CSSProperties = {
  padding: "10px 16px",
  fontWeight: 600,
  fontSize: 11,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const tdStyle: CSSProperties = {
  padding: "12px 16px",
  verticalAlign: "middle",
  color: "#12151a",
};

export default ActiveUsersTable;
