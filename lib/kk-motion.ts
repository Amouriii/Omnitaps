import { useCallback, useLayoutEffect, useRef } from "react";

import { gsap } from "./kk-gsap-config";

/** True when the visitor asked the OS to reduce motion. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Shared tactile "press" feedback: a compact scale-down that springs back.
 * Spread the returned props onto any button so the feel is identical
 * everywhere (order type, tip, quantity steppers…).
 */
export function usePressFeedback() {
  const press = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (prefersReducedMotion()) return;
    const el = e.currentTarget;
    gsap.killTweensOf(el);
    gsap
      .timeline()
      .to(el, { scale: 0.97, duration: 0.08, ease: "power2.out" })
      .to(el, { scale: 1, duration: 0.22, ease: "power3.out" });
  }, []);

  return { onPointerDown: press };
}

/** Fade + rise an element in as soon as it mounts (confirmations, cart lines). */
export function useEnterAnimation<T extends HTMLElement>(enabled = true) {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !enabled || prefersReducedMotion()) return;
    const tween = gsap.fromTo(
      el,
      { opacity: 0, y: 10, height: 0, marginTop: 0 },
      {
        opacity: 1,
        y: 0,
        height: "auto",
        duration: 0.38,
        ease: "power3.out",
        clearProps: "height,margin,transform",
      },
    );
    return () => {
      tween.kill();
    };
  }, [enabled]);

  return ref;
}

/**
 * Collapse an element (fade + height) and only then run `done`, so React can
 * unmount it after the exit animation instead of during it.
 */
export function animateOut(el: HTMLElement | null, done: () => void) {
  if (!el || prefersReducedMotion()) {
    done();
    return;
  }
  gsap.to(el, {
    opacity: 0,
    height: 0,
    marginTop: 0,
    marginBottom: 0,
    paddingTop: 0,
    paddingBottom: 0,
    duration: 0.28,
    ease: "power2.in",
    overwrite: true,
    onComplete: done,
  });
}
