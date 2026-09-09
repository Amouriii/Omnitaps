/**
 * Single source of truth for the Omnitaps LogoMark artwork.
 *
 * Every surface that draws the mark reads from this module:
 * - `LogoMark.jsx` renders it inline in React (site chrome, headers, footers)
 * - `scripts/pwaIconsPlugin.mjs` rasterizes it into the favicon/PWA icons
 *   and emits the favicon SVG files themselves
 *
 * Geometry is the 40×40 canvas from the original LogoMark.jsx. Favicon files
 * use the same geometry with a heavier stroke for 16 px legibility and a
 * padded viewBox so the arc caps don't clip — that's what the `stroke` /
 * `padding` options are for; the paths themselves never fork.
 */

export const LOGO_VIEWBOX_SIZE = 40;

/* Original LogoMark.jsx geometry, verbatim. */
export const LOGO_DOT = { cx: 13, cy: 27, r: 4.5 };

export const LOGO_ARC_INNER =
  "M19.5 27C19.5 20.6487 24.6487 15.5 31 15.5";
export const LOGO_ARC_OUTER =
  "M19.5 33.5C19.5 23.2827 27.7827 15 38 15";

/* Per-surface palette. Indigo/orange = product brand; terracotta/brass = the
   Demo Café guest brand (see demoCafe.css tokens). */
export const LOGO_PALETTE = {
  brand: { primary: "#3A36E0", accent: "#FF8A34" },
  cafe: { primary: "#c45c26", accent: "#c4a35a" },
};

const ACCENT_OPACITY = 0.75; // matching LogoMark.jsx's softer second arc

export type LogoSurface = keyof typeof LOGO_PALETTE;

export type BuildLogoMarkOptions = {
  /** Stroke width for both arcs. LogoMark.jsx uses 3.2; favicon files use 5.5 for small-size legibility. */
  stroke?: number;
  /** Extra padding around the 40×40 artwork; grows the viewBox symmetrically so heavy strokes don't clip. */
  padding?: number;
  /** Color set to use. */
  surface?: LogoSurface;
  /** Accent arc opacity. */
  accentOpacity?: number;
  /** Emit width/height 100% so the SVG fills its sized parent (React usage). */
  responsive?: boolean;
};

/**
 * Render the complete SVG source for the LogoMark.
 * Returns a full `<svg>…</svg>` document string.
 */
export function buildLogoMarkSvg(options: BuildLogoMarkOptions = {}): string {
  const {
    stroke = 3.2,
    padding = 0,
    surface = "brand",
    accentOpacity = ACCENT_OPACITY,
    responsive = false,
  } = options;

  const { primary, accent } = LOGO_PALETTE[surface];
  const viewBox = [
    -padding,
    -padding,
    LOGO_VIEWBOX_SIZE + padding * 2,
    LOGO_VIEWBOX_SIZE + padding * 2,
  ].join(" ");
  const sizeAttrs = responsive ? ' width="100%" height="100%"' : "";

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none"${sizeAttrs}>`,
    `<circle cx="${LOGO_DOT.cx}" cy="${LOGO_DOT.cy}" r="${LOGO_DOT.r}" fill="${primary}" />`,
    `<path d="${LOGO_ARC_INNER}" stroke="${primary}" stroke-width="${stroke}" stroke-linecap="round" />`,
    `<path d="${LOGO_ARC_OUTER}" stroke="${accent}" stroke-width="${stroke}" stroke-linecap="round" opacity="${accentOpacity}" />`,
    `</svg>`,
  ].join("");
}
