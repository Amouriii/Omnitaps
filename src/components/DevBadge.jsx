import { useEffect, useRef, useState } from "react";

const REFRESH_MS = 500;

/**
 * Dev-only HUD badge showing whether the page is actually rendering frames
 * (visibility, focus, rAF rate). Freebuff's preview webContents stops
 * BeginFrames when the Preview tab is occluded, which freezes every
 * frame-gated API (rAF, scroll events, IntersectionObserver) and makes
 * screenshots stale — this badge makes that state visible at a glance
 * instead of forcing a probe. No-ops outside `import.meta.env.DEV`.
 */
export default function DevBadge() {
  const [state, setState] = useState({ fps: null, visibility: null, hasFocus: null });
  const frames = useRef(0);

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;

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
        // Leaving occlusion restarts BeginFrames; drop the first partial
        // window so the rate shown isn't a transient low sample.
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

  if (!import.meta.env.DEV) return null;

  const { fps, visibility, hasFocus } = state;
  const occluded = fps !== null && fps < 5; // hidden pages get 0 BeginFrames
  const tone = visibility === "hidden" || occluded ? "bg-red-600" : "bg-emerald-600";
  const fpsText =
    fps === null ? "…" : occluded ? "0 (occluded)" : String(fps);

  return (
    <div
      data-devbadge="1"
      title="Dev badge: page visibility + rAF rate. 0 fps = preview occluded (frame-gated APIs frozen)."
      className={`fixed bottom-2 left-2 z-[9999] flex items-center gap-x-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] leading-none text-white shadow-lg ${tone}`}
      style={{ pointerEvents: "none" }}
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
