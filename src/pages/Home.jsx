import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { items as SERVICES } from "../data/items";
import LogoMark from "../components/LogoMark";
import SiteFooter from "../components/SiteFooter";
import useScrollReveal, { useBentoPointerGlow } from "../hooks/useScrollReveal";
import HeroMenuDemo from "../components/home/HeroMenuDemo";

/* ================================================================== */
/*  Logo                                                               */
/* ================================================================== */
function Logo({ word = "text-ink" }) {
    return (
        <a href="#top" className="flex items-center gap-2.5 shrink-0" aria-label="Omnitaps home">
            <LogoMark className="w-7 h-7" />
            <span className={`font-display font-semibold text-[19px] tracking-tight ${word}`}>
                Omnitaps
            </span>
        </a>
    );
}

const icons = {
    website: (p) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 9.2h18" />
            <path d="M9.6 12.8 7.6 15l2 2.2" />
            <path d="M14.4 12.8 16.4 15l-2 2.2" />
        </svg>
    ),
    qrMenu: (p) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
            <rect x="3" y="3" width="7" height="7" rx="1.2" />
            <rect x="14" y="3" width="7" height="7" rx="1.2" />
            <rect x="3" y="14" width="7" height="7" rx="1.2" />
            <path d="M14 15h3v3h-3zM19.5 14v3.2M14 19.5h2.2M18 19.5h2.5v1.5" />
        </svg>
    ),
    chatbot: (p) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
            <path d="M4 6.2A2.7 2.7 0 0 1 6.7 3.5h10.6A2.7 2.7 0 0 1 20 6.2v6.6a2.7 2.7 0 0 1-2.7 2.7H10l-4.3 3.6v-3.6H6.7A2.7 2.7 0 0 1 4 12.8z" />
            <path d="M12.3 7.6 13 9.3l1.7.7-1.7.7-.7 1.7-.7-1.7-1.7-.7 1.7-.7z" strokeWidth="1.1" />
        </svg>
    ),
    reservations: (p) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 9.5h18" />
            <path d="M8 3v4M16 3v4" />
            <path d="M8.3 14.5 10.3 16.5 15 12" />
        </svg>
    ),
    reviews: (p) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
            <path d="M12 21s6.75-5.77 6.75-11.25a6.75 6.75 0 0 0-13.5 0C5.25 15.23 12 21 12 21z" />
            <path d="M12 7.4 13 9.6l2.4.35-1.75 1.65.4 2.4L12 12.85l-2.05 1.15.4-2.4L8.6 9.95 11 9.6z" strokeWidth="1.1" />
        </svg>
    ),
    wifi: (p) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" {...p}>
            <circle cx="10.5" cy="18.5" r="1.3" fill="currentColor" stroke="none" />
            <path d="M7.2 15.4a4.7 4.7 0 0 1 6.6 0" />
            <path d="M4.3 12.4a8.9 8.9 0 0 1 12.4 0" />
            <rect x="16.5" y="3.5" width="4.2" height="4.2" rx="0.7" strokeWidth="1.2" />
        </svg>
    ),
};

/* ================================================================== */
/*  Content                                                            */
/* ================================================================== */
const NAV_LINKS = [
    { label: "Solutions", href: "#solutions" },
    { label: "How it works", href: "#how-it-works" },
    { label: "Contact", href: "#cta" },
];

const STEPS = [
    {
        n: "01",
        title: "Connect",
        desc: "Add Omnitaps to your site, tables, and entrance in an afternoon. No developers, no downtime.",
    },
    {
        n: "02",
        title: "Automate",
        desc: "Chatbots answer questions, reservations fill themselves in, and WiFi access happens with a scan — running quietly in the background.",
    },
    {
        n: "03",
        title: "Grow",
        desc: "Reviews, repeat visits, and customer data compound every week, visible in one dashboard instead of six.",
    },
];

const MARQUEE_ITEMS = [
    "Cafés",
    "Boutique hotels",
    "Restaurant groups",
    "Retail chains",
    "Cloud kitchens",
    "Bakeries & delis",
];

const HERO_STATS = [
    { value: "6", label: "modules, one platform" },
    { value: "1", label: "scan to connect" },
    { value: "1", label: "customer record" },
];

/* ================================================================== */
/*  Home Component                                                     */
/* ================================================================== */
export default function Home() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [demoPhase, setDemoPhase] = useState("idle");
    const firstMobileLink = useRef(null);
    const rootRef = useScrollReveal();

    useEffect(() => {
        function onKey(e) {
            if (e.key === "Escape") setMobileOpen(false);
        }
        if (mobileOpen) {
            // focus first link in mobile menu for screen reader / keyboard users
            requestAnimationFrame(() => firstMobileLink.current?.focus());
            window.addEventListener("keydown", onKey);
        }
        return () => window.removeEventListener("keydown", onKey);
    }, [mobileOpen]);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    // Pointer-tracked glow for the bento cards (single delegated listener).
    const onBentoPointerMove = useBentoPointerGlow();

    const enter = (i) => ({ "--enter-delay": `${i * 110}ms` });
    const child = (i) => ({ "--child-delay": `${i * 90}ms` });

    return (
        <div id="top" ref={rootRef} className="min-h-screen w-full bg-porcelain text-ink font-body">
            <a href="#main" className="sr-only focus:not-sr-only absolute left-4 top-4 z-50 bg-surface/95 text-sm rounded-md px-3 py-2">Skip to content</a>
            {/* ---------------- NAV ---------------- */}
            <header className={`site-chrome--top site-header sticky top-0 z-40 border-b border-hairline bg-porcelain/85 backdrop-blur ${scrolled ? "is-scrolled" : ""}`}>
                <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
                    <Logo />

                    <nav aria-label="Primary" className="hidden md:flex items-center gap-8">
                        {NAV_LINKS.map((l) => (
                            <a key={l.label} href={l.href} className="nav-link text-[15px]">
                                {l.label}
                            </a>
                        ))}
                        <Link to="/demo" className="nav-link text-[15px]">
                            Try demos
                        </Link>
                    </nav>

                    <div className="hidden md:flex items-center gap-4">
                        <Link to="/login" className="nav-link text-[15px]">
                            Admin
                        </Link>
                        <a
                            href="#cta"
                            className="btn-primary rounded-lg px-4.5 py-2.5 text-[14px] font-semibold px-5"
                        >
                            Book a Demo
                        </a>
                    </div>

                    <button
                        type="button"
                        className="md:hidden p-2 -mr-2 text-ink"
                        aria-label={mobileOpen ? "Close menu" : "Open menu"}
                        aria-expanded={mobileOpen}
                        aria-controls="mobile-menu"
                        onClick={() => setMobileOpen((v) => !v)}
                    >
                        {mobileOpen ? (
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
                        ) : (
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
                        )}
                    </button>
                </div>

                {mobileOpen && (
                    <div id="mobile-menu" className="md:hidden border-t border-hairline bg-porcelain px-5 pb-6 pt-2">
                        <nav aria-label="Primary" className="flex flex-col gap-1">
                            {NAV_LINKS.map((l, idx) => (
                                <a
                                    key={l.label}
                                    href={l.href}
                                    onClick={() => setMobileOpen(false)}
                                    ref={idx === 0 ? firstMobileLink : null}
                                    className="py-2.5 text-[15px] text-ink-muted"
                                >
                                    {l.label}
                                </a>
                            ))}
                            <Link
                                to="/demo"
                                onClick={() => setMobileOpen(false)}
                                className="py-2.5 text-[15px] text-ink-muted"
                            >
                                Try demos
                            </Link>
                        </nav>
                            <Link
                                to="/login"
                                onClick={() => setMobileOpen(false)}
                                className="py-2.5 text-[15px] text-ink-muted"
                            >
                                Admin
                            </Link>
                            <a
                                href="#cta"
                                onClick={() => setMobileOpen(false)}
                                className="btn-primary mt-3 block text-center rounded-lg px-5 py-3 text-[14px] font-semibold"
                            >
                                Book a Demo
                            </a>
                    </div>
                )}
            </header>

            <main id="main" tabIndex="-1">
                {/* ---------------- HERO (full viewport) ---------------- */}
                <section className="relative overflow-hidden" aria-label="Intro">
                    {/* animated aurora backdrop */}
                    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                        <div className="aurora aurora--tap w-[34rem] h-[34rem] -top-40 -left-32" />
                        <div className="aurora aurora--brass w-[30rem] h-[30rem] top-24 -right-40" />
                        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-porcelain" />
                    </div>

                    <div className="relative max-w-6xl mx-auto px-5 sm:px-8 min-h-[calc(100svh-4rem)] flex items-center py-14 md:py-10">
                        <div className="grid md:grid-cols-[1.05fr_0.95fr] gap-12 md:gap-10 items-center w-full">
                            <div>
                                <div className="hero-enter font-mono text-[12px] tracking-[0.14em] uppercase text-tap mb-5 inline-flex items-center gap-2.5" style={enter(0)}>
                                    <span className="relative flex h-2 w-2" aria-hidden="true">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tap opacity-60" />
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-tap" />
                                    </span>
                                    Digital infrastructure for hospitality &amp; retail
                                </div>
                                <h1
                                    className="hero-enter font-display font-semibold text-[40px] leading-[1.08] sm:text-[52px] md:text-[56px] tracking-[-0.02em] text-ink mb-6 max-w-xl"
                                    style={enter(1)}
                                >
                                    Digitize your entire business with one tap.
                                </h1>
                                <p className="hero-enter text-[17px] leading-[1.6] text-ink-muted max-w-md mb-9" style={enter(2)}>
                                    Omnitaps replaces the six different logins, vendors, and subscriptions
                                    running your restaurant or store with a single connected platform —
                                    website, menus, reservations, reviews, WiFi, and support.
                                </p>
                                <div className="hero-enter flex flex-wrap items-center gap-3" style={enter(3)}>
                                    <a href="#cta" className="btn-primary rounded-lg px-6 py-3.5 text-[15px] font-semibold inline-flex items-center gap-2">
                                        Get Started
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                                    </a>
                                    <a href="#solutions" className="btn-ghost rounded-lg px-6 py-3.5 text-[15px] font-semibold">
                                        View Solutions
                                    </a>
                                </div>

                                <div className="hero-enter mt-10 flex flex-wrap gap-x-10 gap-y-4" style={enter(4)}>
                                    {HERO_STATS.map((s) => (
                                        <div key={s.label}>
                                            <div className="font-display text-[24px] font-semibold text-ink leading-none">{s.value}</div>
                                            <div className="mt-1 text-[12.5px] text-ink-faint">{s.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Signature tap-ripple visual with the live QR mini-demo */}
                            <div className={`hero-enter--zoom relative flex items-center justify-center h-80 sm:h-96 md:h-[26rem] ${demoPhase !== "idle" && demoPhase !== "scanning" ? "demo-active" : ""}`} style={enter(2)}>
                                <div className="absolute inset-6 dot-grid rounded-full" aria-hidden="true" />
                                <div className="ripple-ring w-40 h-40" />
                                <div className="ripple-ring delay-1 w-64 h-64" />
                                <div className="ripple-ring delay-2 w-[22rem] h-[22rem]" />

                                <HeroMenuDemo tenantId="demo" onPhaseChange={setDemoPhase} />

                                <div
                                    className="float-slow absolute z-10 top-[16%] left-[2%] rounded-full border border-hairline bg-surface/90 backdrop-blur px-3.5 py-1.5 text-[12px] font-medium text-ink shadow-[0_10px_24px_-14px_rgba(18,21,26,0.4)] transition-opacity duration-500 demo-chip"
                                    style={{ animationDelay: "1.2s" }}
                                >
                                    <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-tap align-middle" aria-hidden="true" />
                                    Wi‑Fi connected
                                </div>
                                <div
                                    className="float-slow absolute z-10 bottom-[14%] right-[0%] rounded-full border border-hairline bg-surface/90 backdrop-blur px-3.5 py-1.5 text-[12px] font-medium text-ink shadow-[0_10px_24px_-14px_rgba(18,21,26,0.4)] transition-opacity duration-500 demo-chip"
                                    style={{ animationDelay: "2.4s" }}
                                >
                                    <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-brass align-middle" aria-hidden="true" />
                                    Review received
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ---------------- VERTICALS MARQUEE ---------------- */}
                <section aria-label="Built for" className="border-y border-hairline bg-surface/60 py-4">
                    <div className="marquee">
                        <div className="marquee__track items-center gap-10 pr-10">
                            {[0, 1].map((copy) => (
                                <div key={copy} className="flex items-center gap-10" aria-hidden={copy === 1}>
                                    {MARQUEE_ITEMS.map((item) => (
                                        <span key={item} className="flex items-center gap-10 whitespace-nowrap font-mono text-[12px] uppercase tracking-[0.18em] text-ink-faint">
                                            {item}
                                            <span className="h-1 w-1 rounded-full bg-brass" aria-hidden="true" />
                                        </span>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ---------------- SERVICES (bento) ---------------- */}
                <section id="solutions" className="max-w-6xl mx-auto px-5 sm:px-8 py-20 md:py-28 scroll-mt-20">
                <div className="reveal max-w-xl mb-12">
                    <div className="font-mono text-[12px] tracking-[0.14em] uppercase text-brass-dark mb-3">
                        The platform
                    </div>
                    <h2 className="font-display font-semibold text-[30px] md:text-[36px] tracking-[-0.01em] text-ink mb-4">
                        Six tools your team already needs. One place to run them.
                    </h2>
                    <p className="text-[16px] leading-[1.6] text-ink-muted">
                        Every Omnitaps module shares the same customer record, so a WiFi login,
                        a booking, and a review all build the same picture of who walked in.
                    </p>
                </div>

                <div className="grid md:grid-cols-6 gap-4" onPointerMove={onBentoPointerMove}>
                    {SERVICES.map((s, i) => (
                        <Link
                            to={`/items/${s.id}`}
                            key={s.id}
                            className={`reveal-child bento-card block cursor-pointer ${s.col} rounded-2xl border border-hairline bg-surface p-7`}
                            style={child(i)}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="bento-icon w-11 h-11 rounded-xl bg-tap-soft text-tap flex items-center justify-center">
                                    {icons[s.icon]({ className: "w-5 h-5" })}
                                </div>
                                <span className="card-dot w-1.5 h-1.5 rounded-full bg-hairline-strong" />
                            </div>
                            <h3 className="font-display font-semibold text-[17px] text-ink mb-2">
                                {s.title}
                            </h3>
                            <p className="text-[14.5px] leading-[1.6] text-ink-muted">{s.desc}</p>
                            <span className="card-arrow mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-tap" aria-hidden="true">
                                Explore
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                            </span>
                        </Link>
                    ))}
                </div>
                </section>

                {/* ---------------- HOW IT WORKS ---------------- */}
                <section id="how-it-works" className="border-y border-hairline bg-surface">
                <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 md:py-28">
                    <div className="reveal max-w-xl mb-14">
                        <div className="font-mono text-[12px] tracking-[0.14em] uppercase text-tap mb-3">
                            How it works
                        </div>
                        <h2 className="font-display font-semibold text-[30px] md:text-[36px] tracking-[-0.01em] text-ink">
                            From tool stack to one tap, in three steps.
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-10 md:gap-8">
                        {STEPS.map((s, i) => (
                            <div key={s.n} className="reveal-child relative" style={child(i)}>
                                <div
                                    className="font-display text-[34px] font-semibold mb-4 text-tap-soft"
                                    style={{ WebkitTextStroke: "1.5px var(--color-tap)" }}
                                >
                                    {s.n}
                                </div>
                                <h3 className="font-display font-semibold text-[18px] text-ink mb-2">
                                    {s.title}
                                </h3>
                                <p className="text-[14.5px] leading-[1.6] text-ink-muted max-w-xs">
                                    {s.desc}
                                </p>
                                {i < STEPS.length - 1 && (
                                    <span className="step-line hidden md:block absolute top-4 right-[-1.1rem] w-4 h-px bg-hairline-strong" aria-hidden="true" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                </section>

                {/* ---------------- BOTTOM CTA ---------------- */}
                <section id="cta" className="max-w-6xl mx-auto px-5 sm:px-8 py-20 md:py-28">
                <div className="reveal--zoom reveal relative overflow-hidden rounded-3xl bg-ink px-8 py-16 md:px-16 md:py-20 text-center">
                    <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-tap opacity-20 blur-2xl" />
                    <div className="pointer-events-none absolute -bottom-24 -left-14 w-72 h-72 rounded-full bg-brass opacity-15 blur-2xl" />

                    <div className="relative">
                        <h2 className="font-display font-semibold text-[30px] md:text-[42px] leading-[1.1] tracking-[-0.01em] text-white mb-5 max-w-2xl mx-auto">
                            Ready to run your business on one tap?
                        </h2>
                        <p className="text-[16px] text-white/60 max-w-md mx-auto mb-10">
                            Join hospitality and retail teams who replaced their tool stack with
                            a single connected platform.
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                            <a href="#top" className="btn-primary rounded-lg px-7 py-3.5 text-[15px] font-semibold">
                                Get Started
                            </a>
                            <a
                                href="#top"
                                className="rounded-lg px-7 py-3.5 text-[15px] font-semibold text-white border border-white/20 hover:border-white/40 transition-colors"
                            >
                                Talk to Sales
                            </a>
                        </div>
                        <div className="mt-8 text-[13px] text-white/55">
                            <Link to="/demo" className="hover:text-white transition-colors">
                                Demo Café Hub
                            </Link>
                        </div>
                    </div>
                </div>
                </section>

            </main>

            <SiteFooter />
        </div>
    );
}
