import { useLayoutEffect, type RefObject } from "react";

import { gsap } from "../kk-gsap-config";
import { prefersReducedMotion } from "../pa-motion";

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

    const context = gsap.context(() => {
      gsap.fromTo(target, { xPercent: -distance }, {
        xPercent: distance,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.6,
        },
      });
    }, section);

    return () => context.revert();
  }, [distance, sectionRef, selector]);
}
