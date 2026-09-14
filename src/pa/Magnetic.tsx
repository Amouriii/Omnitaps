import {
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { gsap } from "../../lib/kk-gsap-config";
import { prefersReducedMotion } from "../../lib/pa-motion";

type MagneticProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  /** Fraction of the pointer distance that the control follows. */
  strength?: number;
};

/**
 * A small GSAP-powered magnetic field for important controls. The transform
 * stays on this wrapper, so the button inside keeps its own press/hover scale.
 */
export function Magnetic({
  children,
  strength = 0.16,
  className,
  ...props
}: MagneticProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    const xTo = gsap.quickTo(el, "x", { duration: 0.35, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.35, ease: "power3.out" });

    const onMove = (event: PointerEvent) => {
      const bounds = el.getBoundingClientRect();
      xTo((event.clientX - (bounds.left + bounds.width / 2)) * strength);
      yTo((event.clientY - (bounds.top + bounds.height / 2)) * strength);
    };
    const reset = () => {
      xTo(0);
      yTo(0);
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", reset);
    el.addEventListener("pointercancel", reset);

    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", reset);
      el.removeEventListener("pointercancel", reset);
      gsap.killTweensOf(el);
    };
  }, [strength]);

  return (
    <span ref={ref} className={className} {...props}>
      {children}
    </span>
  );
}
