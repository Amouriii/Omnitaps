import { useEffect, useRef } from "react";

/**
 * CafeReveal — scroll-triggered entrance wrapper.
 *
 * Adds `is-visible` (CSS in demoCafe.css) when the element enters the
 * viewport, with an optional per-item stagger delay. Works for any count
 * of children via a fragment (React 19) and degrades gracefully when
 * IntersectionObserver is unavailable. Browsers with reduced-motion are
 * handled in CSS — the element is simply never hidden there.
 */
export default function CafeReveal({ children, delay = 0, variant = "up", as: Tag = "div", className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    if (typeof IntersectionObserver === "undefined") {
      node.classList.add("is-visible");
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
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const variantClass =
    variant === "left" ? "cafe-reveal--left" : variant === "right" ? "cafe-reveal--right" : variant === "scale" ? "cafe-reveal--scale" : "";

  return (
    <Tag
      ref={ref}
      className={`cafe-reveal ${variantClass} ${className}`.trim()}
      style={delay ? { "--reveal-delay": `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
