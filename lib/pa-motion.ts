import { useCallback, useLayoutEffect, useRef } from "react";

import { gsap } from "./kk-gsap-config";

/** True when the visitor asked the OS to reduce motion. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Shared tactile press feedback for the Pablo & Abdo demo controls. */
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

/** Neon heading flicker used by the long-form diner sections. */
export function useNeonFlicker<T extends HTMLElement = HTMLHeadingElement>() {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    gsap.set(el, { opacity: 0.06 });
    const tl = gsap.timeline({
      scrollTrigger: { trigger: el, start: "top 85%", once: true },
    });
    tl.to(el, { opacity: 0.85, duration: 0.1, ease: "power2.out" })
      .to(el, { opacity: 0.25, duration: 0.07 })
      .to(el, { opacity: 1, duration: 0.12 })
      .to(el, { opacity: 0.5, duration: 0.06 })
      .to(el, { opacity: 1, duration: 0.16, ease: "power3.out" });

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
      gsap.set(el, { clearProps: "opacity" });
    };
  }, []);

  return ref;
}

/** Fade + rise an element in as soon as it mounts. */
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

/** Collapse an element before removing it from the React tree. */
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
