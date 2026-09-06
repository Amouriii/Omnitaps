/**
 * Compact branded header for the guest captive portal (440px mobile flow).
 * The full marketing SiteHeader (Try demos / Book a Demo) is intentionally NOT
 * used here — this page is what a venue's guest sees when joining Wi‑Fi, so it
 * carries only the Omnitaps wordmark. The venue name and status live in the
 * page's own header below.
 */

export default function PortalHeader() {
  return (
    <header style={{ marginBottom: 24, textAlign: "center" }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <svg
          viewBox="0 0 40 40"
          width={22}
          height={22}
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
            fontSize: 17,
            letterSpacing: "-0.01em",
            color: "#12151a",
          }}
        >
          Omnitaps
        </span>
      </div>
    </header>
  );
}
