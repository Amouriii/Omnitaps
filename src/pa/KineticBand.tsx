import { useLayoutEffect, useRef } from "react";

import { gsap } from "../../lib/kk-gsap-config";
import { prefersReducedMotion } from "../../lib/pa-motion";

const WORDS = [
  "FRESH",
  "طازة",
  "DINER",
  "FUSION",
  "NEON",
  "CAIRO",
  "BRISKET",
  "FTEER",
];

/**
 * A full-viewport kinetic type band between hero and story: giant outlined
 * words slide horizontally, scrubbed 1:1 to scroll — plus a pink neon bar
 * that draws across the band and a progress counter (01 → 08). Transform-
 * only animations (compositor-friendly), reduced-motion visitors get a
 * static strip.
 */
export function KineticBand() {
  const bandRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const counterRef = useRef<HTMLSpanElement | null>(null);

  useLayoutEffect(() => {
    const band = bandRef.current;
    const track = trackRef.current;
    if (!band || !track || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      // Distance = how far the oversized track overflows its container.
      const distance = () => track.scrollWidth - window.innerWidth;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: band,
          start: "top top",
          end: "+=140%",
          scrub: 0.5,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      tl.fromTo(
        track,
        { x: () => 0 },
        { x: () => -distance(), ease: "none" },
        0,
      );

      // Neon bar draws left→right across the band in sync.
      tl.fromTo(
        barRef.current,
        { scaleX: 0 },
        { scaleX: 1, ease: "none", transformOrigin: "left center" },
        0,
      );

      // Every second word flips its outline fill — a scrolling checkerboard.
      const words = track.querySelectorAll<HTMLElement>("[data-word]");
      words.forEach((w, i) => {
        if (i % 2 !== 0) return;
        tl.fromTo(
          w,
          { opacity: 0.35 },
          {
            opacity: 1,
            duration: 0.5,
            ease: "none",
            scrollTrigger: {
              trigger: w,
              containerAnimation: tl,
              start: "left 80%",
              end: "left 30%",
              scrub: true,
            },
          },
          0,
        );
      });

      // 01 → 08 progress counter (plain object + onUpdate — no TextPlugin).
      const counter = { n: 1 };
      tl.to(
        counter,
        {
          n: WORDS.length,
          duration: 1,
          ease: "none",
          onUpdate: () => {
            if (counterRef.current) {
              counterRef.current.textContent = String(
                Math.round(counter.n),
              ).padStart(2, "0");
            }
          },
        },
        0,
      );
    }, band);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={bandRef}
      aria-hidden="true"
      className="relative isolate flex h-[100dvh] items-center overflow-hidden border-y-2 border-[#C4C8CC]/25 bg-[#1b1b1b]"
    >
      {/* Neon draw bar */}
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[#C4C8CC]/15" />
      <div
        ref={barRef}
        className="absolute inset-x-0 top-1/2 h-[3px] origin-left bg-gradient-to-r from-[#F2597F] via-[#29D9FF] to-[#F2597F] shadow-[0_0_24px_#F2597F99]"
      />

      <div ref={trackRef} className="flex w-max items-center gap-14 px-[10vw]">
        {WORDS.map((word, i) => (
          <span
            key={`${word}-${i}`}
            data-word
            className={`whitespace-nowrap font-display text-[18vw] leading-none md:text-[11rem] ${
              i % 2 === 0
                ? "text-transparent [-webkit-text-stroke:2px_#C4C8CC66]"
                : "text-[#F2597F] [text-shadow:0_0_18px_#F2597F88]"
            }`}
          >
            {word}
          </span>
        ))}
      </div>

      <span className="label-mono absolute bottom-8 right-6 text-[#29D9FF]/80">
        <span ref={counterRef}>01</span>
        <span className="text-white/40"> / {WORDS.length}</span>
      </span>
    </section>
  );
}
