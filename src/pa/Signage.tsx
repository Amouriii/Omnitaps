import type { ReactNode, CSSProperties } from "react";

type SignageProps = {
  children: ReactNode;
  /** neon | blue — which tube color the sign glows with. */
  tone?: "pink" | "blue";
  className?: string;
};

/**
 * Bungee text rendered as a neon tube sign: layered glow via text-shadow,
 * identical to how the real storefront signage reads at night in Heliopolis.
 * Decorative glow only — the text itself stays fully readable.
 */
export function Signage({ children, tone = "pink", className }: SignageProps) {
  const color = tone === "pink" ? "var(--pa-pink)" : "var(--pa-blue)";
  return (
    <span
      aria-hidden="false"
      className={`pa-signage ${className ?? ""}`}
      style={
        {
          "--sign-color": color,
        } as CSSProperties
      }
    >
      {children}
    </span>
  );
}
