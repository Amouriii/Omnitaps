import { useLayoutEffect, useRef } from "react";

import { gsap } from "../../lib/kk-gsap-config";
import { prefersReducedMotion } from "../../lib/pa-motion";

/** A tiny ScrollTrigger-driven reading progress indicator. */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const bar = ref.current;
    if (!bar) return;
    if (prefersReducedMotion()) {
      gsap.set(bar, { scaleX: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.set(bar, { scaleX: 0, transformOrigin: "left center" });
      gsap.to(bar, {
        scaleX: 1,
        ease: "none",
        scrollTrigger: { start: 0, end: "max", scrub: 0.2 },
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-1 bg-transparent"
    >
      <div
        ref={ref}
        className="h-full origin-left bg-[#F2597F] shadow-[0_0_12px_#F2597F]"
      />
    </div>
  );
}
