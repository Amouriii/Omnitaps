import { useCallback, useEffect, useRef, useState } from "react";
import LogoMark from "../LogoMark";
import { motionMs } from "../../lib/motion.js";

const INTRO_DURATION_TOKEN = "--motion-dur-product-intro";
const INTRO_EXIT_TOKEN = "--motion-dur-product-intro-exit";
const INTRO_FALLBACK_MS = 3200;
const EXIT_FALLBACK_MS = 650;

const MODULES = [
    { label: "Websites", x: 50, y: 8 },
    { label: "QR menus", x: 88, y: 28 },
    { label: "Support", x: 88, y: 76 },
    { label: "Reservations", x: 50, y: 92 },
    { label: "Reviews", x: 12, y: 76 },
    { label: "WiFi", x: 12, y: 28 },
];

/**
 * A short product-led boot sequence for the Omnitaps marketing homepage.
 * The six orbiting nodes mirror the platform modules resolving into one
 * connected customer experience. It is intentionally local to Home rather
 * than the app shell, so product routes remain quick and distraction-free.
 */
export default function OmnitapsIntro() {
    const [visible, setVisible] = useState(() => {
        if (typeof window === "undefined") return false;
        return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    });
    const [leaving, setLeaving] = useState(false);
    const autoTimer = useRef(null);
    const pageRef = useRef(null);
    const exitTimer = useRef(null);
    const skipButtonRef = useRef(null);

    const dismiss = useCallback(() => {
        window.clearTimeout(autoTimer.current);
        setLeaving(true);
    }, []);

    useEffect(() => {
        if (!visible) return undefined;

        document.documentElement.classList.add("omnitaps-intro-active");
        const page = document.getElementById("top");
        pageRef.current = page;
        page?.setAttribute("aria-hidden", "true");
        page?.setAttribute("inert", "");
        skipButtonRef.current?.focus();
        autoTimer.current = window.setTimeout(
            dismiss,
            motionMs(INTRO_DURATION_TOKEN, INTRO_FALLBACK_MS),
        );

        const onKeyDown = (event) => {
            if (event.key === "Escape") dismiss();
        };
        window.addEventListener("keydown", onKeyDown);

        return () => {
            window.clearTimeout(autoTimer.current);
            window.removeEventListener("keydown", onKeyDown);
            document.documentElement.classList.remove("omnitaps-intro-active");
            pageRef.current?.removeAttribute("aria-hidden");
            pageRef.current?.removeAttribute("inert");
            pageRef.current = null;
        };
    }, [dismiss, visible]);

    useEffect(() => {
        if (!leaving) return undefined;

        exitTimer.current = window.setTimeout(
            () => setVisible(false),
            motionMs(INTRO_EXIT_TOKEN, EXIT_FALLBACK_MS),
        );
        return () => window.clearTimeout(exitTimer.current);
    }, [leaving]);

    if (!visible) return null;

    return (
        <div
            className={`omnitaps-intro ${leaving ? "is-leaving" : ""}`.trim()}
            role="dialog"
            aria-modal="true"
            aria-label="Omnitaps platform intro"
        >
            <div className="omnitaps-intro__grid" aria-hidden="true" />
            <div className="omnitaps-intro__scan" aria-hidden="true" />
            <div className="omnitaps-intro__glow omnitaps-intro__glow--one" aria-hidden="true" />
            <div className="omnitaps-intro__glow omnitaps-intro__glow--two" aria-hidden="true" />

            <div className="omnitaps-intro__content">
                <div className="omnitaps-intro__status">
                    <span className="omnitaps-intro__status-dot" aria-hidden="true" />
                    <span>Omnitaps / Network boot</span>
                    <span className="omnitaps-intro__status-code">01—06</span>
                </div>

                <div className="omnitaps-intro__network" aria-hidden="true">
                    <svg className="omnitaps-intro__links" viewBox="0 0 100 100" fill="none">
                        {MODULES.map((module, index) => (
                            <line
                                key={module.label}
                                className="omnitaps-intro__link"
                                x1="50"
                                y1="50"
                                x2={module.x}
                                y2={module.y}
                                style={{ "--link-delay": `${index * 110 + 180}ms` }}
                            />
                        ))}
                    </svg>

                    {MODULES.map((module, index) => (
                        <span
                            key={module.label}
                            className="omnitaps-intro__module"
                            style={{
                                "--module-x": `${module.x}%`,
                                "--module-y": `${module.y}%`,
                                "--module-delay": `${index * 110 + 320}ms`,
                            }}
                        >
                            <span className="omnitaps-intro__module-dot" />
                            <span className="omnitaps-intro__module-label">{module.label}</span>
                        </span>
                    ))}

                    <div className="omnitaps-intro__core">
                        <span className="omnitaps-intro__core-ring omnitaps-intro__core-ring--one" />
                        <span className="omnitaps-intro__core-ring omnitaps-intro__core-ring--two" />
                        <span className="omnitaps-intro__core-mark">
                            <LogoMark className="h-9 w-9" />
                        </span>
                    </div>
                </div>

                <div className="omnitaps-intro__copy">
                    <p className="omnitaps-intro__eyebrow">One tap. Every touchpoint.</p>
                    <h1>Connecting your business.</h1>
                    <p className="omnitaps-intro__subcopy">
                        Bringing your website, menu, guests, and team into one system.
                    </p>
                </div>

                <div className="omnitaps-intro__progress" aria-hidden="true">
                    <span className="omnitaps-intro__progress-track">
                        <span className="omnitaps-intro__progress-fill" />
                    </span>
                    <span className="omnitaps-intro__progress-label">Initializing connected platform</span>
                </div>
            </div>

            <button
                ref={skipButtonRef}
                type="button"
                className="omnitaps-intro__skip"
                onClick={dismiss}
            >
                Skip intro
                <span aria-hidden="true">↗</span>
            </button>
        </div>
    );
}
