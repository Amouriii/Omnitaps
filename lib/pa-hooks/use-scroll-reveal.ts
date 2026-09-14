import { useLayoutEffect, useRef, type RefObject } from "react";

import { gsap } from "../kk-gsap-config";
import { prefersReducedMotion } from "../pa-motion";

type RevealOptions = {
  selector?: string;
  stagger?: number;
  start?: string;
  direction?: "up" | "left" | "right";
};

export function useScrollReveal<T extends HTMLElement = HTMLElement>(
  options: RevealOptions = {},
): RefObject<T | null> {
  const {
    selector = "[data-reveal]",
    stagger = 0.08,
    start = "top 85%",
    direction = "up",
  } = options;
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const section = ref.current;
    if (!section) return;
    const targets = section.querySelectorAll<HTMLElement>(selector);
    if (!targets.length) return;

    if (prefersReducedMotion()) {
      gsap.set(targets, { opacity: 1, x: 0, y: 0, clearProps: "transform" });
      return;
    }

    const from = direction === "left"
      ? { opacity: 0, x: -24 }
      : direction === "right"
        ? { opacity: 0, x: 24 }
        : { opacity: 0, y: 24 };
    const context = gsap.context(() => {
      gsap.fromTo(targets, from, {
        opacity: 1,
        x: 0,
        y: 0,
        duration: 0.48,
        stagger,
        ease: "power3.out",
        clearProps: "transform",
        scrollTrigger: { trigger: section, start, once: true },
      });
    }, section);

    return () => context.revert();
  }, [direction, selector, stagger, start]);

  return ref;
}
