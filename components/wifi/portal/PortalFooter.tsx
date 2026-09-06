/**
 * Compact branded footer for the guest captive portal (440px mobile flow).
 * The full marketing SiteFooter is intentionally NOT used here: the portal is
 * what a venue's guest sees when joining Wi‑Fi, so it carries only the wordmark,
 * a tagline, and About/Contact — not the marketing product/legal sitemap.
 */

import type { CSSProperties } from "react";

const linkStyle: CSSProperties = {
  color: "#155eef",
  fontSize: 12,
  fontWeight: 600,
  textDecoration: "none",
};

export default function PortalFooter() {
  return (
    <footer
      style={{
        marginTop: 32,
        paddingTop: 18,
        borderTop: "1px solid #e7e4dd",
        textAlign: "center",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <svg
          viewBox="0 0 40 40"
          width={20}
          height={20}
          fill="none"
          aria-hidden="true"
        >
          <circle cx="13" cy="27" r="4.5" fill="#3A36E0" />
          <path
            d="M19.5 27C19.5 20.6487 24.6487 15.5 31 15.5"
            stroke="#3A36E0"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <path
            d="M19.5 33.5C19.5 23.2827 27.7827 15 38 15"
            stroke="#FF8A34"
            strokeWidth="3.2"
            strokeLinecap="round"
            opacity="0.5"
          />
        </svg>
        <span
          style={{
            fontFamily:
              'var(--font-display, "Instrument Sans", system-ui, sans-serif)',
            fontWeight: 600,
            fontSize: 16,
            letterSpacing: "-0.01em",
            color: "#12151a",
          }}
        >
          Omnitaps
        </span>
      </div>
      <p
        style={{
          margin: "6px 0 0",
          color: "#9a9fa8",
          fontSize: 12,
        }}
      >
        Digital infrastructure for hospitality &amp; retail
      </p>
      <p
        style={{
          margin: "10px 0 0",
          color: "#9a9fa8",
          fontSize: 12,
        }}
      >
        Secure captive access · session quotas enforced in real time
      </p>
      <nav
        aria-label="Footer"
        style={{
          marginTop: 10,
          display: "flex",
          justifyContent: "center",
          gap: 18,
        }}
      >
        <a href="/about" style={linkStyle}>About</a>
        <a href="/contact" style={linkStyle}>Contact</a>
      </nav>
    </footer>
  );
}
