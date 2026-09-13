import { useLayoutEffect, type RefObject } from "react";

import { gsap } from "../kk-gsap-config";
import { prefersReducedMotion } from "../kk-motion";

/**
 * Drives decorative type horizontally through a section. Keeping this as a
 * dedicated hook makes the continuous ScrollTrigger treatment reusable while
 * leaving semantic page content and layout untouched.
 */
export function useKineticScroll(
  sectionRef: RefObject<HTMLElement | null>,
  selector: string,
  distance = 18,
) {
  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section || prefersReducedMotion()) return;

    const target = section.querySelector<HTMLElement>(selector);
    if (!target) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        target,
        { xPercent: -distance },
        {
          xPercent: distance,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.6,
          },
        },
      );
    }, section);

    return () => ctx.revert();
  }, [distance, sectionRef, selector]);
}
