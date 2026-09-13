import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, X } from "lucide-react";
import { motionMs } from "../../lib/motion.js";

const TITLE = "Demo Café";
// The auto-dismiss shadows --motion-dur-scan-intro (the intro's longest
// animation); read live so retunes of the CSS retime the conductor too.
const INTRO_TOKEN = "--motion-dur-scan-intro";
const INTRO_FALLBACK_MS = 7200;
const LEAVE_FALLBACK_MS = 550;

function CupSteam() {
  return (
    <div className="cafe-intro__pour-scene" aria-hidden="true">
      <span className="cafe-intro__steam cafe-intro__steam--one" />
      <span className="cafe-intro__steam cafe-intro__steam--two" />
      <span className="cafe-intro__steam cafe-intro__steam--three" />
      <span className="cafe-intro__pitcher">
        <span className="cafe-intro__pitcher-body" />
        <span className="cafe-intro__pitcher-handle" />
        <span className="cafe-intro__pitcher-spout" />
      </span>
      <span className="cafe-intro__milk-stream" />
      <span className="cafe-intro__cup-wrap">
        <span className="cafe-intro__cup">
          <span className="cafe-intro__cup-fill" />
          <span className="cafe-intro__cup-foam" />
        </span>
        <span className="cafe-intro__cup-handle" />
      </span>
    </div>
  );
}

/**
 * CafeIntro — entry screen for the Demo Café guest experience.
 *
 * Plays on every page load so a refresh reliably gets the full café welcome,
 * is fully skippable (click anywhere, Escape, or the Skip button), and never
 * renders for users who prefer reduced motion.
 */
export default function CafeIntro({ tenantName = TITLE }) {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  const [leaving, setLeaving] = useState(false);
  const hideTimer = useRef(null);
  const autoTimer = useRef(null);
  const pageRef = useRef(null);
  const introRef = useRef(null);
  const inertNodesRef = useRef([]);
  const enterButtonRef = useRef(null);

  const dismiss = useCallback(() => {
    setLeaving((alreadyLeaving) => {
      if (alreadyLeaving) return alreadyLeaving;
      return true;
    });
  }, []);

  useEffect(() => {
    if (!visible) return undefined;

    document.documentElement.classList.add("cafe-intro-active");
    const page = document.getElementById("root");
    pageRef.current = page;
    const intro = introRef.current;
    const inertNodes = [...document.body.children]
      .filter((node) => node !== intro)
      .map((node) => ({
        node,
        ariaHidden: node.getAttribute("aria-hidden"),
        inert: node.inert,
      }));
    inertNodesRef.current = inertNodes;
    for (const { node } of inertNodes) {
      node.setAttribute("aria-hidden", "true");
      node.inert = true;
    }
    enterButtonRef.current?.focus();
    autoTimer.current = window.setTimeout(
      dismiss,
      motionMs(INTRO_TOKEN, INTRO_FALLBACK_MS)
    );

    const onKeyDown = (event) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(autoTimer.current);
      window.removeEventListener("keydown", onKeyDown);
      document.documentElement.classList.remove("cafe-intro-active");
      for (const { node, ariaHidden, inert } of inertNodesRef.current) {
        if (ariaHidden === null) node.removeAttribute("aria-hidden");
        else node.setAttribute("aria-hidden", ariaHidden);
        node.inert = inert;
      }
      inertNodesRef.current = [];
      pageRef.current = null;
      introRef.current = null;
    };
  }, [visible, dismiss]);

  useEffect(() => {
    if (!leaving) return undefined;
    // Shadows the .is-leaving animation (cafe-intro-out @ --motion-dur-pop).
    hideTimer.current = window.setTimeout(
      () => setVisible(false),
      motionMs("--motion-dur-pop", LEAVE_FALLBACK_MS)
    );
    return () => window.clearTimeout(hideTimer.current);
  }, [leaving]);

  if (!visible) return null;

  return (
    <div
      ref={introRef}
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
