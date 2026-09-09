/**
 * JS mirror of the motion tokens in src/styles/siteMotion.css.
 *
 * Timers that choreograph JS-driven sequences (intro dismissals, phase
 * machines) must stay in sync with the CSS durations they shadow. Reading
 * the tokens at use-time keeps them synced through any retune of the
 * stylesheet — change the CSS, and the JS conductors follow.
 *
 * Call inside effects/handlers (not at module scope) so the stylesheet is
 * guaranteed to be loaded before the value is read.
 *
 *   const waitMs = motionMs('--motion-dur-scan-intro', 3200);
 */
export function motionMs(token, fallbackMs) {
    if (typeof window === "undefined" || typeof window.getComputedStyle !== "function") {
        return fallbackMs;
    }
    const raw = window.getComputedStyle(document.documentElement).getPropertyValue(token).trim();
    if (!raw) return fallbackMs;
    const value = Number.parseFloat(raw);
    if (Number.isNaN(value)) return fallbackMs;
    return raw.endsWith("ms") ? value : Math.round(value * 1000);
}
