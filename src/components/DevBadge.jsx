import { useEffect, useRef, useState } from "react";

const REFRESH_MS = 500;
const TOGGLE_KEY = "devbadge-visible";

function isDev() {
  return import.meta.env.DEV;
}

function readStoredPrefs() {
  if (!isDev()) return { visible: false };
  try {
    const raw = window.localStorage.getItem("devbadge-prefs");
    if (!raw) return { visible: false };
    const parsed = JSON.parse(raw);
    return { visible: Boolean(parsed.visible) };
  } catch {
    return { visible: false };
  }
}

function writePrefs(prefs) {
  if (!isDev()) return;
  try {
    window.localStorage.setItem("devbadge-prefs", JSON.stringify(prefs));
  } catch {
    /* noop */
  }
}

/**
 * Dev-only HUD badge showing whether the page is actually rendering frames
 * (visibility, focus, rAF rate). Freebuff's preview webContents stops
 * BeginFrames when the Preview tab is occluded, which freezes every
 * frame-gated API (rAF, scroll events, IntersectionObserver) and makes
 * screenshots stale — this badge makes that state visible at a glance
 * instead of forcing a probe. Hidden by default; toggle with Ctrl/Cmd+Shift+D
 * or the badge itself. Persists choice in localStorage. No-ops outside dev.
 */
export default function DevBadge() {
  const [state, setState] = useState({ fps: null, visibility: null, hasFocus: null });
  const [visible, setVisible] = useState(() => readStoredPrefs().visible);
  const frames = useRef(0);

  useEffect(() => {
    if (!isDev()) return undefined;

    let raf = 0;
    let warmup = true;
    const tick = () => {
      frames.current += 1;
      raf = requestAnimationFrame(tick);
    };

    const interval = setInterval(() => {
      const fps = warmup ? null : frames.current;
      warmup = false;
      frames.current = 0;
      setState({
        fps,
        visibility: document.visibilityState,
        hasFocus: document.hasFocus(),
      });
    }, REFRESH_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        warmup = true;
        frames.current = 0;
      }
      setState((s) => ({ ...s, visibility: document.visibilityState }));
    };
    document.addEventListener("visibilitychange", onVisibility);

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!isDev()) return undefined;

    const handleKey = (event) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        (event.key === "d" || event.key === "D")
      ) {
        event.preventDefault();
        setVisible((v) => {
          const next = !v;
          writePrefs({ visible: next });
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  if (!isDev() || !visible) return null;

  const { fps, visibility, hasFocus } = state;
  const occluded = fps !== null && fps < 5;
  const tone = visibility === "hidden" || occluded ? "bg-red-600" : "bg-emerald-600";
  const fpsText =
    fps === null ? "…" : occluded ? "0 (occluded)" : String(fps);

  return (
    <div
      data-devbadge="1"
      title="Dev badge: page visibility + rAF rate. 0 fps = preview occluded. Toggle: Ctrl/Cmd+Shift+D"
      className={`fixed bottom-2 left-2 z-[9999] flex items-center gap-x-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] leading-none text-white shadow-lg ${tone}`}
      style={{ pointerEvents: "auto" }}
      onClick={() => setVisible(false)}
    >
      <span aria-hidden="true">◉</span>
      <span>{fpsText} fps</span>
      <span aria-hidden="true">·</span>
      <span>{visibility ?? "…"}</span>
      {hasFocus === false ? <span aria-hidden="true">·</span> : null}
      {hasFocus === false ? <span>unfocused</span> : null}
      {hasFocus === true ? <span className="sr-only">focused</span> : null}
    </div>
  );
}
