import React, { useEffect, useRef } from "react";

export default function Modal({ open, onClose, title, children }) {
  const containerRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement;
    // focus the container for screen reader users
    containerRef.current?.focus();

    function onKey(e) {
      if (e.key === "Escape") onClose?.();
      // Basic focus trap: keep focus inside modal
      if (e.key === "Tab") {
        const focusable = containerRef.current?.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div
        className="fixed inset-0 bg-black/40"
        aria-hidden="true"
        onClick={() => onClose?.()}
      />

      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || "Dialog"}
        tabIndex={-1}
        className="relative z-10 w-full max-w-2xl bg-surface rounded-2xl p-6 shadow-lg"
      >
        <div className="flex items-start justify-between mb-4">
          {title ? <h2 className="font-display font-semibold text-[18px]">{title}</h2> : null}
          <button
            onClick={() => onClose?.()}
            aria-label="Close dialog"
            className="text-ink-muted ml-4"
          >
            ✕
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}
