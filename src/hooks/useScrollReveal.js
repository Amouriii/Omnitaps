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

        const reveal = (el) => el.classList.add("is-visible");
        const inViewport = (el) => {
            const rect = el.getBoundingClientRect();
            return rect.top < window.innerHeight && rect.bottom > 0;
        };

        // Reveal whatever is on screen right now. Without this first pass a
        // section that is already visible can stay at opacity:0 until a scroll
        // event nudges the observer — which reads as "my changes did not appear"
        // after a reload, and hides everything when the tab is in the background
        // and animations are paused.
        const revealInView = () => {
            for (const el of targets) {
                if (!el.classList.contains("is-visible") && inViewport(el)) {
                    reveal(el);
                }
            }
        };
        revealInView();

        // Re-run the pass when the tab regains focus, so a page left open in a
        // background tab renders its content instead of a half-faded screenshot.
        const onVisibility = () => {
            if (document.visibilityState === "visible") revealInView();
        };
        document.addEventListener("visibilitychange", onVisibility);

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        reveal(entry.target);
                        observer.unobserve(entry.target);
                    }
                }
            },
            { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
        );

        for (const el of targets) {
            if (!el.classList.contains("is-visible")) observer.observe(el);
        }
        return () => {
            observer.disconnect();
            document.removeEventListener("visibilitychange", onVisibility);
        };
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
