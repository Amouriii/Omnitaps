import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, X } from "lucide-react";

const INTRO_SEEN_KEY = "cafe-intro-seen";

const TITLE = "Demo Café";
const INTRO_DURATION = 3200;

function CupSteam() {
  return (
    <>
      <span className="cafe-intro__steam" />
      <span className="cafe-intro__steam" />
      <span className="cafe-intro__steam" />
      <span className="cafe-intro__cup-wrap" aria-hidden="true">
        <span className="cafe-intro__cup">
          <span className="cafe-intro__cup-fill" />
        </span>
        <span className="cafe-intro__cup-handle" />
      </span>
    </>
  );
}

/**
 * CafeIntro — entry screen for the Demo Café guest experience.
 *
 * Plays once per browser session (sessionStorage gate), is fully
 * skippable (click anywhere, Escape, or the Skip button), and never
 * renders at all for users who prefer reduced motion.
 */
export default function CafeIntro({ tenantName = TITLE }) {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    try {
      return window.sessionStorage.getItem(INTRO_SEEN_KEY) !== "1";
    } catch {
      return true;
    }
  });
  const [leaving, setLeaving] = useState(false);
  const hideTimer = useRef(null);
  const autoTimer = useRef(null);
  const enterButtonRef = useRef(null);

  const dismiss = useCallback(() => {
    setLeaving((alreadyLeaving) => {
      if (alreadyLeaving) return alreadyLeaving;
      try {
        window.sessionStorage.setItem(INTRO_SEEN_KEY, "1");
      } catch {
        // Storage may be unavailable; intro still dismisses for this visit.
      }
      return true;
    });
  }, []);

  useEffect(() => {
    if (!visible) return undefined;

    document.documentElement.classList.add("cafe-intro-active");
    enterButtonRef.current?.focus();
    autoTimer.current = window.setTimeout(dismiss, INTRO_DURATION);

    const onKeyDown = (event) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(autoTimer.current);
      window.removeEventListener("keydown", onKeyDown);
      document.documentElement.classList.remove("cafe-intro-active");
    };
  }, [visible, dismiss]);

  useEffect(() => {
    if (!leaving) return undefined;
    hideTimer.current = window.setTimeout(() => setVisible(false), 700);
    return () => window.clearTimeout(hideTimer.current);
  }, [leaving]);

  if (!visible) return null;

  return (
    <div
      className={`cafe-intro ${leaving ? "is-leaving" : ""}`.trim()}
      role="dialog"
      aria-modal="true"
      aria-label={`${tenantName} intro`}
      onClick={dismiss}
    >
      <div className="cafe-intro__grain" aria-hidden="true" />
      <div className="cafe-intro__inner" onClick={(event) => event.stopPropagation()}>
        <div className="cafe-intro__kicker">
          <span className="cafe-intro__kicker-dot" aria-hidden="true" />
          Harbor Lane · Demo City
        </div>
        <CupSteam />
        <p className="cafe-intro__word" aria-label={tenantName}>
          {tenantName.split("").map((char, index) =>
            char === " " ? (
              <span key={`space-${index}`}> </span>
            ) : (
              <span key={`letter-${index}`} className="cafe-intro__letter" style={{ "--d": `${index * 55}ms` }}>
                {char}
              </span>
            ),
          )}
        </p>
        <span className="cafe-intro__rule" aria-hidden="true" />
        <p className="cafe-intro__tag">Coffee · Plates · Quiet corners</p>
        <button ref={enterButtonRef} type="button" className="cafe-intro__enter" onClick={dismiss}>
          Enter the café
          <ArrowDown aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      <button type="button" className="cafe-intro__skip" onClick={dismiss} aria-label="Skip intro">
        <X aria-hidden="true" className="h-4 w-4" />
        <span>Skip intro</span>
      </button>
    </div>
  );
}
