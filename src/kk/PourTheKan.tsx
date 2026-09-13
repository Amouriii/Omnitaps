import { useLayoutEffect, useRef } from "react";

import { Button } from "../kk/ui/button";
import { gsap, ScrollTrigger } from "../../lib/kk-gsap-config";
import { prefersReducedMotion } from "../../lib/kk-motion";

/* ============================================================
   Scroll-powered coffee cup fill (pure SVG, scaleY fill).
   - Cup body: trapezoid, wider at top, narrower at bottom.
   - Straw: 8px wide, base centered on the cup's top edge, top 30px above it.
   - Liquid: separate rect inside the cup bounds, fills via scaleY only.
   - Outline: stroke-dasharray reveal, top → bottom.
   - Straw and glass never animate.
   ============================================================ */

const CUP_VIEWBOX = "0 0 200 300";

/* Cup body: top edge y=100 spanning x 20→180, bottom anchor y=270. */
const CUP_D = "M20 100 H180 L149 270 Q100 284 51 270 Z";

/* Liquid rect: spans the full interior width at the cup's top edge; the
   clip path trims it to the trapezoid at every fill level. Bottom = 277,
   the curve Q(149,270)(100,284)(51,270)'s true lowest point — so the fill
   is visible from the first percent of scroll with no dead zone. */
const LIQUID_X = 24;
const LIQUID_Y = 104;
const LIQUID_W = 152;
const LIQUID_H = 173;
/* Transform origin in absolute viewBox user units: cup center x, liquid
   bottom y. `svgOrigin` bypasses bbox-relative origin math, which breaks on
   scaled viewBoxes. */
const FILL_ORIGIN = "100 277";

/* Straw: x 96→104 (centered on cup center x=100), base at the cup's top
   edge y=100, top 30px above it at y=70. */
const STRAW_X = 96;
const STRAW_Y = 70;
const STRAW_W = 8;
const STRAW_H = 34;

export function PourTheKan() {
  const sectionRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    if (prefersReducedMotion()) {
      section.classList.add("no-scroll-animation");
      return;
    }
    section.classList.remove("no-scroll-animation");

    let refreshFrame = 0;
    const refresh = () => {
      cancelAnimationFrame(refreshFrame);
      refreshFrame = requestAnimationFrame(() => ScrollTrigger.refresh());
    };

    const ctx = gsap.context(() => {
      const outline = section.querySelector<SVGPathElement>(".cup-outline");
      const fill = section.querySelector<SVGRectElement>(".path-fill");
      const progress = section.querySelector<HTMLElement>(
        "[data-pour-progress]",
      );
      const complete = section.querySelector<HTMLElement>(
        "[data-pour-complete]",
      );

      // Establish start states explicitly so route transitions or a
      // ScrollTrigger refresh can never leave them indeterminate.
      if (outline) {
        gsap.set(outline, {
          strokeDasharray: outline.getTotalLength(),
          strokeDashoffset: outline.getTotalLength(),
        });
      }
      if (fill) gsap.set(fill, { scaleY: 0, svgOrigin: FILL_ORIGIN });
      if (progress) gsap.set(progress, { scaleX: 0, transformOrigin: "left center" });
      if (complete) gsap.set(complete, { autoAlpha: 0, y: 16 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          scroller: window,
          // Pin starts when the section top hits the viewport top so the cup
          // never scrolls away half-drawn, and hold for one extra viewport
          // after the timeline ends: at 1x scroll speed the 854px pin would
          // otherwise flash past in ~0.3s during a fast scroll, filling the
          // cup invisibly. The dwell keeps the full kan on screen while the
          // reader scrolls out.
          start: "top top",
          end: () => "+=" + window.innerHeight * 2,
          pin: true,
          // scrub: 0.3 lets the liquid keep pouring briefly after input
          // stops (like settling liquid) instead of freezing mid-scroll.
          scrub: 0.3,
          fastScrollEnd: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      tl.to(outline, { strokeDashoffset: 0, duration: 1, ease: "none" }, 0)
        .to(fill, { scaleY: 1, svgOrigin: FILL_ORIGIN, duration: 1, ease: "none" }, 0)
        .to(progress, { scaleX: 1, duration: 1, ease: "none" }, 0)
        .to(
          complete,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.15,
            ease: "back.out(1.7)",
          },
          0.85,
        );
    }, section);

    // Frame-batched refresh prevents resize bursts from re-measuring the pin
    // spacer on every event. (Lenis already drives ScrollTrigger updates.)
    window.addEventListener("resize", refresh);
    refresh();

    return () => {
      window.removeEventListener("resize", refresh);
      cancelAnimationFrame(refreshFrame);
      ctx.revert();
    };
  }, []);

  return (
    <section
      id="pour"
      ref={sectionRef}
      className="pour-section relative grid min-h-svh place-items-center overflow-hidden bg-ink px-5 py-16 text-cream"
      aria-labelledby="pour-title"
    >
      <p className="pour-section__watermark" aria-hidden="true">
        POUR · SIP · REPEAT
      </p>

      <div className="relative z-10 grid w-full max-w-6xl items-center gap-12 md:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.1fr)] md:gap-20">
        <div
          className="cup-container mx-auto"
          role="img"
          aria-label="A Koffee Kulture cup that fills with coffee as the page is scrolled"
        >
          <svg
            className="cup-svg"
            viewBox={CUP_VIEWBOX}
            aria-hidden="true"
            focusable="false"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="coffee-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#956744" />
                <stop offset="45%" stopColor="#6F4E37" />
                <stop offset="100%" stopColor="#422817" />
              </linearGradient>
              {/* Liquid is clipped to the cup body so it never spills past
                  the walls at any fill level. */}
              <clipPath id="cup-liquid-clip">
                <path d={CUP_D} />
              </clipPath>
            </defs>

            <path className="cup-glass" d={CUP_D} />

            <g clipPath="url(#cup-liquid-clip)">
              <rect
                className="path-fill"
                x={LIQUID_X}
                y={LIQUID_Y}
                width={LIQUID_W}
                height={LIQUID_H}
                fill="url(#coffee-gradient)"
                opacity="0.96"
              />
            </g>

            {/* Straw: perfectly centered, static, never animated. */}
            <rect
              className="cup-straw"
              x={STRAW_X}
              y={STRAW_Y}
              width={STRAW_W}
              height={STRAW_H}
              rx="2"
            />

            <path
              className="cup-outline"
              d={CUP_D}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
            />
          </svg>
        </div>

        <div className="max-w-xl md:justify-self-end">
          <span className="label-mono text-primary">01 — Scroll to pour</span>
          <h2
            id="pour-title"
            className="mt-4 font-display text-5xl font-extrabold leading-[0.92] sm:text-6xl lg:text-7xl"
          >
            Fill your <span className="text-primary">Koffee Kan.</span>
          </h2>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-cream/70 sm:text-lg">
            Every scroll turns into another pour. Head back up at any point to
            drain it, then keep going until your kup is ready to sip.
          </p>

          <div
            className="mt-8 h-1 w-full max-w-sm overflow-hidden rounded-full bg-cream/20"
            aria-hidden="true"
          >
            <div
              data-pour-progress
              className="pour-section__progress h-full bg-primary"
            />
          </div>

          <p
            data-pour-complete
            className="mt-5 translate-y-4 font-display text-xl font-bold text-primary opacity-0"
          >
            Kup full. Ready to sip.
          </p>

          <Button asChild size="lg" className="mt-7">
            <a href="#menu">Choose your pour</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
