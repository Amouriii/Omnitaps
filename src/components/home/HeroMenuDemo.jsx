import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import LogoMark from "../LogoMark";
import { productCategories as PRODUCT_CATEGORIES } from "../../data/productModules";
import { motionMs } from "../../lib/motion.js";

/**
 * Live hero mini-demo: the QR card is a real phone-scan simulation.
 *
 * The marketing homepage opens a categorized menu of Omnitaps product modules;
 * the café website demo keeps using the public tenant menu with its order tally.
 * idle → scanning (QR tiles light up, scan line sweeps) → menu → back to idle.
 *
 * The payload is fetched once and cached at module level so replays are
 * instant; failures degrade to an offline state that still links to the
 * real menu. Reduced-motion users get no auto-scan and no sweep — the
 * menu opens immediately on tap.
 *
 * theme="product" — Omnitaps marketing hero (dark card, Omnitaps mark).
 * theme="cafe"    — embedded on the tenant website hero (café copy, café
 *                   mark); colors follow the scoped café tokens automatically
 *                   because every class here is a theme variable utility.
 */

const LIT_TILES = [1, 2, 4, 7, 8, 9, 11, 13, 14];
const SCAN_STEPS = LIT_TILES.length;
const SCAN_STEP_MS = 85;
// Shadows --motion-dur-scan-fast (the fast scan's own duration) so the
// menu never opens before the sweep completes, through any CSS retune.
const SCAN_MIN_TOKEN = "--motion-dur-scan-fast";
const SCAN_MIN_FALLBACK_MS = 1150;
const PRODUCT_SCAN_MS = 720;

const menuCache = new Map();

function formatCents(cents) {
    return `$${(cents / 100).toFixed(2)}`;
}

export default function HeroMenuDemo({ tenantId = "demo", onPhaseChange = undefined, theme = "product" }) {
    const isCafe = theme === "cafe";
    const [phase, setPhase] = useState("idle"); // idle | scanning | menu | error
    const [litCount, setLitCount] = useState(SCAN_STEPS);
    const [menu, setMenu] = useState(null);
    const [activeCat, setActiveCat] = useState(0);
    const [order, setOrder] = useState([]);
    const timersRef = useRef([]);
    const scanRunRef = useRef(0);
    const panelRef = useRef(null);

    const prefersReducedMotion = useCallback(
        () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        [],
    );

    const clearTimers = useCallback(() => {
        for (const id of timersRef.current) {
            window.clearInterval(id);
            window.clearTimeout(id);
        }
        timersRef.current = [];
    }, []);

    useEffect(() => () => {
        scanRunRef.current += 1;
        clearTimers();
    }, [clearTimers]);

    useEffect(() => {
        onPhaseChange?.(phase);
    }, [phase, onPhaseChange]);

    const fetchMenu = useCallback(async () => {
        if (!isCafe) return PRODUCT_CATEGORIES;
        const cachedMenu = menuCache.get(tenantId);
        if (cachedMenu) return cachedMenu;
        const load = async () => {
            const response = await fetch(`/api/tenants/${encodeURIComponent(tenantId)}/menu`);
            if (!response.ok) throw new Error(`Menu request failed (${response.status})`);
            const payload = await response.json();
            const categories = Array.isArray(payload?.menu?.categories) ? payload.menu.categories : [];
            if (!categories.length) throw new Error("Empty menu payload");
            return categories;
        };
        // One quick retry rides out transient backend hiccups so the demo
        // doesn't flash its error face on a momentary failure.
        try {
            const categories = await load();
            menuCache.set(tenantId, categories);
            return categories;
        } catch {
            await new Promise((resolve) => setTimeout(resolve, 400));
            const categories = await load();
            menuCache.set(tenantId, categories);
            return categories;
        }
    }, [isCafe, tenantId]);

    const startScan = useCallback(() => {
        // Only an idle card may begin a scan — a stray timer firing while the
        // menu is open must never wipe it back to the QR face.
        if (phase !== "idle") return;
        clearTimers();
        const runId = ++scanRunRef.current;
        setOrder([]);
        setActiveCat(0);

        const reduced = prefersReducedMotion();
        const fetchPromise = fetchMenu();
        let finished = false;

        if (reduced) {
            // No theatrics: resolve as soon as the data is (or was) available.
            fetchPromise
                .then((categories) => {
                    if (runId !== scanRunRef.current) return;
                    setMenu(categories);
                    setPhase("menu");
                    requestAnimationFrame(() => panelRef.current?.focus({ preventScroll: true }));
                })
                .catch(() => {
                    if (runId === scanRunRef.current) setPhase("error");
                });
            return;
        }

        setPhase("scanning");
        setLitCount(0);

        const stepTimer = window.setInterval(() => {
            setLitCount((count) => {
                if (count >= SCAN_STEPS) {
                    window.clearInterval(stepTimer);
                    return count;
                }
                return count + 1;
            });
        }, SCAN_STEP_MS);
        timersRef.current.push(stepTimer);

        const scanDelay = new Promise((resolve) => {
            const t = window.setTimeout(
                resolve,
                isCafe ? motionMs(SCAN_MIN_TOKEN, SCAN_MIN_FALLBACK_MS) : PRODUCT_SCAN_MS
            );
            timersRef.current.push(t);
        });

        Promise.all([fetchPromise, scanDelay])
            .then(([categories]) => {
                if (finished || runId !== scanRunRef.current) return;
                finished = true;
                setMenu(categories);
                setPhase("menu");
                requestAnimationFrame(() => panelRef.current?.focus({ preventScroll: true }));
            })
            .catch(() => {
                if (finished || runId !== scanRunRef.current) return;
                finished = true;
                setPhase("error");
            });
    }, [clearTimers, fetchMenu, phase, prefersReducedMotion]);

    const reset = useCallback(() => {
        clearTimers();
        scanRunRef.current += 1;
        setPhase("idle");
        setOrder([]);
        setLitCount(SCAN_STEPS);
    }, [clearTimers]);

    // Auto-play the scan ONCE per mount, shortly after the hero entrance.
    // The guard is essential: startScan's identity changes on every phase
    // change, so an unguarded effect would re-schedule itself forever and
    // yank the menu back to the QR card every couple of seconds.
    const hasAutoPlayedRef = useRef(false);
    useEffect(() => {
        if (hasAutoPlayedRef.current || prefersReducedMotion()) return undefined;
        // Wait for the hero entrance to land (hero-rise + beats) before autoplaying.
        // Flag flips only when the timer actually fires: StrictMode's
        // mount→cleanup→mount cycle clears the first schedule, so claiming
        // the flag at schedule time would permanently cancel the autoplay.
        const t = window.setTimeout(
            () => {
                hasAutoPlayedRef.current = true;
                startScan();
            },
            motionMs("--motion-dur-hero", 850) + 750
        );
        timersRef.current.push(t);
        return () => window.clearTimeout(t);
    }, [prefersReducedMotion, startScan]);

    const addItem = (item) => {
        if (item.isAvailable === false || item.product) return;
        setOrder((current) => [...current, { name: item.name, priceCents: item.priceCents ?? 0 }]);
    };

    const orderCents = order.reduce((sum, entry) => sum + entry.priceCents, 0);
    const categories = menu ?? [];
    const activeCategory = categories[activeCat] ?? categories[0];
    const moduleCount = categories.reduce((count, category) => count + (category.items?.length ?? 0), 0);

    /* ---------------- idle / scanning: the QR card ---------------- */
    const qrFace = (
        <button
            type="button"
            onClick={phase === "scanning" ? reset : startScan}
            aria-label={
                phase === "scanning"
                    ? "Cancel scanning and keep the menu closed"
                    : isCafe
                        ? "Scan the table QR to preview today's menu"
                        : "Scan to explore Omnitaps modules"
            }
            className={`qr-card press-scale group relative z-10 w-52 sm:w-56 rounded-3xl bg-ink text-porcelain p-6 shadow-[0_32px_64px_-24px_rgba(18,21,26,0.45)] text-left ${
                phase === "scanning" ? "qr-card--scanning cursor-pointer" : "cursor-pointer"
            }`}
        >
            <span className={`scan-line ${phase === "scanning" ? "scan-line--fast" : ""}`} aria-hidden="true" />
            {isCafe ? (
                <span className="mb-6 inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-tap" aria-hidden="true" />
                    <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-porcelain/70">
                        Demo Café
                    </span>
                </span>
            ) : (
                <LogoMark className="w-6 h-6 text-tap mb-6" />
            )}
            <div className="grid grid-cols-4 gap-1.5 mb-6" aria-hidden="true">
                {Array.from({ length: 16 }).map((_, i) => {
                    const litIndex = LIT_TILES.indexOf(i);
                    const lit = litIndex !== -1 && litIndex < litCount;
                    return (
                        <span
                            key={i}
                            className={`qr-tile aspect-square rounded-[3px] ${lit ? "qr-tile--lit" : ""}`}
                        />
                    );
                })}
            </div>
            <div className="font-mono text-[11px] tracking-widest uppercase text-white/50">
                {phase === "scanning" ? (isCafe ? "Opening today's menu…" : "Loading modules…") : isCafe ? "Scan the table QR" : "Scan to explore"}
            </div>
            <div className="mt-2 text-[12px] font-medium text-tap opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                {phase === "scanning" ? "Live demo in progress" : isCafe ? "Tap to preview →" : "Tap to browse modules →"}
            </div>
        </button>
    );

    /* ---------------- menu: the live payload ---------------- */
    const menuFace = (
        <div
            ref={panelRef}
            tabIndex={-1}
            role="group"
            aria-label={isCafe ? "Live QR menu demo" : "Categorized Omnitaps module menu"}
            className={`demo-face relative z-10 w-72 sm:w-[22rem] rounded-3xl border border-hairline bg-surface text-ink shadow-[0_32px_64px_-24px_rgba(18,21,26,0.35)] overflow-hidden outline-none ${isCafe ? "demo-face--cafe" : "demo-face--modules"}`}
            data-module-count={isCafe ? undefined : moduleCount}
        >
            <div className="demo-menu-header flex items-center justify-between px-4 pt-4 pb-3 border-b border-hairline">
                <div className="flex items-center gap-2 min-w-0">
                    {isCafe ? (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-tap" aria-hidden="true" />
                    ) : (
                        <LogoMark className="w-4.5 h-4.5 text-tap shrink-0" />
                    )}
                    <span className="font-display text-[13.5px] font-semibold">
                        {isCafe ? "Today's menu" : "Omnitaps modules"}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={reset}
                    className="shrink-0 rounded-full border border-hairline px-2.5 py-1 text-[11px] font-medium text-ink-muted hover:text-ink hover:border-hairline-strong transition-colors"
                >
                    ↺ Rescan
                </button>
            </div>

            <div className={`demo-menu-body flex min-h-0 flex-1 ${isCafe ? "demo-menu-body--cafe" : "demo-menu-body--modules"}`}>
                <div
                    className="demo-category-tabs flex w-16 sm:w-[4.75rem] shrink-0 flex-col gap-1.5 border-r border-hairline px-2 pt-3"
                    role="tablist"
                    aria-label={isCafe ? "Menu categories" : "Product module categories"}
                    aria-orientation="vertical"
                >
                    {categories.map((category, index) => (
                        <button
                            id={`demo-category-tab-${index}`}
                            key={category.title ?? index}
                            type="button"
                            role="tab"
                            aria-selected={index === activeCat}
                            onClick={() => setActiveCat(index)}
                            className={`demo-category-tab w-full rounded-lg px-2 py-1.5 text-left text-[11.5px] font-semibold transition-colors ${
                                index === activeCat
                                    ? "bg-tap text-white"
                                    : "bg-tap-soft text-tap hover:bg-tap hover:text-white"
                            }`}
                            aria-controls="demo-category-panel"
                        >
                            <span>{category.title}</span>
                            {!isCafe ? <span className="demo-category-count" aria-hidden="true">{category.items.length}</span> : null}
                        </button>
                    ))}
                </div>

                <div className="demo-module-content min-w-0 flex-1">
                    {!isCafe ? (
                        <div className="demo-module-meta flex items-center justify-between gap-2 px-3 pt-3">
                            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">Browse modules</span>
                            <span className="text-[10px] font-medium text-tap">{activeCategory?.items.length ?? 0} to explore</span>
                        </div>
                    ) : null}
                    <ul
                        key={activeCat}
                        id="demo-category-panel"
                        role="tabpanel"
                        aria-labelledby={`demo-category-tab-${activeCat}`}
                        className="demo-module-list min-w-0 px-2.5 py-2 max-h-56 overflow-y-auto"
                        aria-live="polite"
                    >
                {(activeCategory?.items ?? []).map((item, index) => {
                    const soldOut = item.isAvailable === false;
                    return (
                        <li
                            key={item.id ?? `${item.name}-${index}`}
                            className={`demo-module-item flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-tap-soft/60 transition-colors ${item.product ? "demo-module-item--product" : ""}`}
                        >
                            {item.product ? (
                                <span className="demo-module-icon" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                            ) : null}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                    {item.product ? (
                                        <Link
                                            to={`/items/${item.id}`}
                                            className="demo-module-link text-[12.5px] font-medium leading-4 hover:text-tap"
                                        >
                                            {item.name}
                                        </Link>
                                    ) : (
                                        <span className="text-[12.5px] font-medium truncate">{item.name}</span>
                                    )}
                                    {item.badge && !soldOut ? (
                                        <span className="shrink-0 rounded-full bg-brass-soft px-1.5 py-0.5 text-[9.5px] font-semibold text-brass-dark">
                                            {item.badge}
                                        </span>
                                    ) : null}
                                    {soldOut ? (
                                        <span className="shrink-0 rounded-full bg-hairline px-1.5 py-0.5 text-[9.5px] font-semibold text-ink-muted">
                                            Sold out
                                        </span>
                                    ) : null}
                                </div>
                                {item.product ? (
                                    <p className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-ink-faint">{item.summary}</p>
                                ) : (
                                    <div className="text-[11px] text-ink-faint">{item.price}</div>
                                )}
                            </div>
                            {item.product ? (
                                <Link
                                    to={`/items/${item.id}`}
                                    aria-label={`Explore ${item.name}`}
                                    className="demo-module-arrow shrink-0 text-[16px] font-semibold leading-none text-tap hover:text-tap-dark"
                                >
                                    →
                                </Link>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => addItem(item)}
                                    disabled={soldOut}
                                    aria-label={`Add ${item.name} to demo order`}
                                    className={`shrink-0 h-6 w-6 rounded-full text-[13px] leading-none font-semibold transition ${
                                        soldOut
                                            ? "bg-hairline text-ink-faint cursor-not-allowed"
                                            : "bg-tap text-white hover:bg-tap-dark active:scale-90"
                                    }`}
                                >
                                    +
                                </button>
                            )}
                        </li>
                    );
                })}
                    </ul>
                </div>
            </div>

            <div className={`demo-menu-footer flex items-center justify-between gap-2 border-t border-hairline px-4 py-3 bg-porcelain ${isCafe ? "demo-menu-footer--cafe" : "demo-menu-footer--modules"}`}>
                <span key={order.length} className="order-pop text-[12px] font-semibold text-ink">
                    {isCafe
                        ? order.length
                            ? `${order.length} item${order.length > 1 ? "s" : ""} · ${formatCents(orderCents)}`
                            : "Tap + to order"
                        : "Select a module to explore"}
                </span>
                <Link
                    to={isCafe ? "/menu/demo" : "/#solutions"}
                    className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-ink-muted transition-colors"
                >
                    {isCafe ? "Full menu" : "View all"}
                </Link>
            </div>
        </div>
    );

    /* ---------------- error: API unreachable ---------------- */
    const errorFace = (
        <div
            ref={panelRef}
            tabIndex={-1}
            role="alert"
            className="demo-face relative z-10 w-64 sm:w-72 rounded-3xl border border-hairline bg-surface text-ink p-6 shadow-[0_32px_64px_-24px_rgba(18,21,26,0.35)] outline-none"
        >
            {isCafe ? (
                <span className="mb-4 inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-tap" aria-hidden="true" />
                    <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink-muted">
                        Demo Café
                    </span>
                </span>
            ) : (
                <LogoMark className="w-6 h-6 text-tap mb-4" />
            )}
            <p className="text-[13.5px] font-semibold">{isCafe ? "Demo kitchen is offline" : "Module menu unavailable"}</p>
            <p className="mt-1.5 text-[12.5px] leading-5 text-ink-muted">
                {isCafe ? "The live menu couldn't be reached right now — the real thing is one tap away." : "The module menu is ready to browse from the homepage."}
            </p>
            <div className="mt-4 flex items-center gap-2">
                <Link
                    to={isCafe ? "/menu/demo" : "/#solutions"}
                    className="rounded-full bg-ink px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-ink-muted transition-colors"
                >
                    {isCafe ? "Open the menu" : "View modules"}
                </Link>
                <button
                    type="button"
                    onClick={reset}
                    className="rounded-full border border-hairline px-3.5 py-2 text-[12px] font-medium text-ink-muted hover:text-ink transition-colors"
                >
                    Try again
                </button>
            </div>
        </div>
    );

    return (
        <>
            {phase === "menu" ? menuFace : phase === "error" ? errorFace : qrFace}
            <span className="sr-only" role="status">
                {phase === "menu"
                    ? `${isCafe ? "Live menu loaded" : "Omnitaps module menu loaded"} — ${moduleCount} ${isCafe ? "items" : "modules"}`
                    : ""}
            </span>
        </>
    );
}
