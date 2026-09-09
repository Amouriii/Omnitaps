import { useCallback, useEffect, useRef } from "react";

/**
 * Scroll-reveal: adds `.is-visible` to elements carrying `.reveal`,
 * `.reveal-child`, or `.step-line` once they enter the viewport.
 * Elements already in view on mount animate immediately; everything
 * degrades to fully-visible markup when IntersectionObserver is
 * unavailable or the user prefers reduced motion (CSS handles both).
 */
const REVEAL_SELECTOR = ".reveal, .reveal-child, .step-line, .chrome-reveal";

export default function useScrollReveal() {
    const rootRef = useRef(null);

    useEffect(() => {
        const root = rootRef.current;
        if (!root) return undefined;

        // The root element itself may carry a reveal class (e.g. SiteFooter
        // uses .chrome-reveal on its own <footer>), so include it as a target.
        const targets = [...root.querySelectorAll(REVEAL_SELECTOR)];
        if (root.matches?.(REVEAL_SELECTOR)) {
            targets.push(root);
        }

        if (typeof IntersectionObserver === "undefined") {
            for (const el of targets) {
                el.classList.add("is-visible");
            }
            return undefined;
        }
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            return undefined;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible");
                        observer.unobserve(entry.target);
                    }
                }
            },
            { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
        );

        for (const el of targets) {
            observer.observe(el);
        }
        return () => observer.disconnect();
    }, []);

    return rootRef;
}

/**
 * Pointer-tracked glow for `.bento-card` surfaces: one delegated listener
 * feeds --pointer-x/--pointer-y custom properties that the CSS radial
 * gradient in siteMotion.css consumes. Shared by Home and About.
 */
export function useBentoPointerGlow() {
    return useCallback((event) => {
        const card = event.target.closest?.(".bento-card");
        if (!card) return;
        const bounds = card.getBoundingClientRect();
        card.style.setProperty("--pointer-x", `${event.clientX - bounds.left}px`);
        card.style.setProperty("--pointer-y", `${event.clientY - bounds.top}px`);
    }, []);
}
