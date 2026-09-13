import { useLayoutEffect, useRef } from "react";

import { gsap } from "../kk-gsap-config";

type RevealOptions = {
  /** Which descendants to reveal. Defaults to `[data-reveal]`. */
  selector?: string;
  /** Delay between each element in the group. */
  stagger?: number;
  /** ScrollTrigger start position. */
  start?: string;
  /** Direction a group enters from. */
  direction?: "up" | "left" | "right";
};

/**
 * Attach the returned ref to a section container and mark any descendants
 * with `data-reveal` — they fade + slide up once the section scrolls in.
 *
 * Pass a custom `selector` to run a second, independently-triggered group
 * (e.g. the rows inside a single menu card) without flattening every item
 * on the page into one long cascade.
 */
export function useScrollReveal<T extends HTMLElement = HTMLElement>(
  options: RevealOptions = {},
) {
  const {
    selector = "[data-reveal]",
    stagger = 0.08,
    start = "top 85%",
    direction = "up",
  } = options;
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const targets = el.querySelectorAll<HTMLElement>(selector);
    if (targets.length === 0) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) {
      gsap.set(targets, { opacity: 1, y: 0, clearProps: "transform" });
      return;
    }

    const from =
      direction === "left"
        ? { opacity: 0, x: -24 }
        : direction === "right"
          ? { opacity: 0, x: 24 }
          : { opacity: 0, y: 24 };

    const ctx = gsap.context(() => {
      gsap.fromTo(targets, from, {
        opacity: 1,
        y: 0,
        x: 0,
        duration: 0.48,
        stagger,
        ease: "power3.out",
        // Return transform ownership to CSS so hover states can take over
        // once the reveal has completed.
        clearProps: "transform",
        scrollTrigger: { trigger: el, start, once: true },
      });
    }, el);

    return () => ctx.revert();
  }, [direction, selector, stagger, start]);

  return ref;
}
