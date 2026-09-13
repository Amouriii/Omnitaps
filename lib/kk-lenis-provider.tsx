import { useLayoutEffect, type ReactNode } from "react";
import Lenis from "lenis";

import { gsap, ScrollTrigger } from "./kk-gsap-config";

/**
 * Wires up real smooth/inertia scrolling for the whole site.
 *
 * Unlike a hand-rolled "wrap everything in a transformed div" hack (or GSAP's
 * own ScrollSmoother, which explicitly breaks fixed-position elements),
 * Lenis smooths the browser's *actual* scroll position rather than faking
 * it — position: sticky (our Nav), anchor links, and accessibility all keep
 * working. See https://github.com/darkroomengineering/lenis
 *
 * Skipped entirely for prefers-reduced-motion: reduce — native scroll for
 * those visitors, same policy as every other animation in this app.
 */
export function LenisProvider({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) return;

    const lenis = new Lenis({
      // Exponential smoothing with a fast attack: motion starts almost
      // immediately under the wheel and settles in ~0.4s. The previous
      // duration: 1.2 glide lagged every scrubbed animation (notably the
      // pour fill) by up to a second, so fast scrolls blew past the section
      // before the cup had visibly filled.
      lerp: 0.11,
      autoRaf: false,
      smoothWheel: true,
      // Nav's links are real href="#story" anchors — without this Lenis
      // ignores them while a smooth scroll is in progress.
      anchors: true,
    });

    // Keep every existing ScrollTrigger (hero parallax, section reveals,
    // per-card menu stagger) synced to Lenis's smoothed position instead of
    // the raw native one.
    lenis.on("scroll", ScrollTrigger.update);

    // Standard GSAP + Lenis integration: drive Lenis off GSAP's own ticker
    // (already running for every other animation) instead of a second RAF
    // loop, and disable GSAP's lag-smoothing since Lenis handles that itself.
    const update = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    // Native resize changes document geometry; update Lenis first, then ask
    // ScrollTrigger to recalculate every start/end point against that geometry.
    const refresh = () => {
      lenis.resize();
      ScrollTrigger.refresh();
    };
    window.addEventListener("resize", refresh);
    // Fonts/images settling late change document height, which shifts every
    // pin start/end; resync once they finish so the pour begins exactly
    // where the geometry says it should.
    document.fonts?.ready?.then(() => ScrollTrigger.refresh());
    window.addEventListener("load", refresh);
    const refreshFrame = requestAnimationFrame(refresh);

    return () => {
      window.removeEventListener("resize", refresh);
      window.removeEventListener("load", refresh);
      cancelAnimationFrame(refreshFrame);
      gsap.ticker.remove(update);
      lenis.off("scroll", ScrollTrigger.update);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
