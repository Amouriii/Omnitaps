import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Mail, MessageCircle, Phone } from "lucide-react";
import { items as SERVICES } from "../data/items";
import { PRODUCT_MODULE_COUNT } from "../data/productModules";
import LogoMark from "../components/LogoMark";
import ThemeToggle from "../components/ThemeToggle";
import SiteFooter from "../components/SiteFooter";
import useScrollReveal, { useBentoPointerGlow } from "../hooks/useScrollReveal";
import HeroMenuDemo from "../components/home/HeroMenuDemo";
import HeroCommerceVisual from "../components/home/HeroCommerceVisual";
import OmnitapsIntro from "../components/home/OmnitapsIntro";

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
    wallet: (p) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
            <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19a1 1 0 0 1 1 1v13H6.5A2.5 2.5 0 0 1 4 16.5z" />
            <path d="M4 8h14a2 2 0 0 1 2 2v6H6.5A2.5 2.5 0 0 0 4 18.5" />
            <circle cx="16.5" cy="12" r="1" fill="currentColor" stroke="none" />
        </svg>
    ),
    rewards: (p) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
            <path d="M8 4h8v4H8zM6 8h12v4a6 6 0 0 1-12 0z" />
            <path d="M12 18v3M9 21h6M6 10H4a2 2 0 0 0 0 4h2M18 10h2a2 2 0 0 1 0 4h-2" />
        </svg>
    ),
};

/* ================================================================== */
/*  Content                                                            */
/* ================================================================== */
const NAV_LINKS = [
    { label: "Solutions", to: "/#solutions" },
    { label: "How it works", to: "/#how-it-works" },
    { label: "Contact", to: "/contact" },
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
    { value: String(PRODUCT_MODULE_COUNT), label: "modules in one package" },
    { value: "1", label: "company to deal with" },
    { value: "1", label: "customer record" },
];

/* Direct ways to reach the people who build and run Omnitaps. */
const CONTACT_CHANNELS = [
    {
        label: "Email",
        value: "mosameh15@outlook.com",
        hint: "Replies within one business day",
        href: "mailto:mosameh15@outlook.com",
        icon: Mail,
    },
    {
        label: "Call",
        value: "+20 10 1564 5898",
        hint: "Mon–Fri · 9:00–18:00 PT",
        href: "tel:+201015645898",
        icon: Phone,
    },
    {
        label: "WhatsApp",
        value: "+20 10 1564 5898",
        hint: "Fastest for quick questions",
        href: "https://wa.me/201015645898",
        icon: MessageCircle,
        external: true,
    },
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
        <>
            <OmnitapsIntro />
            <div id="top" ref={rootRef} className="min-h-screen w-full bg-porcelain text-ink font-body">
            <a href="#main" className="sr-only focus:not-sr-only absolute left-4 top-4 z-50 bg-surface/95 text-sm rounded-md px-3 py-2">Skip to content</a>
            {/* ---------------- NAV ---------------- */}
            <header className={`site-chrome--top site-header sticky top-0 z-40 border-b border-hairline bg-porcelain/85 backdrop-blur ${scrolled ? "is-scrolled" : ""}`}>
                <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
                    <Logo />

                    <nav aria-label="Primary" className="hidden md:flex items-center gap-8">
                        {NAV_LINKS.map((l) => (
                            <Link key={l.label} to={l.to} className="nav-link text-[15px]">
                                {l.label}
                            </Link>
                        ))}
                        <Link to="/demo" className="nav-link text-[15px]">
                            Try demos
                        </Link>
                    </nav>

                    <div className="hidden md:flex items-center gap-4">
                        <ThemeToggle />
                        <Link to="/login" className="nav-link text-[15px]">
                            Admin
                        </Link>
                        <Link
                            to="/contact"
                            className="btn-primary rounded-lg px-4.5 py-2.5 text-[14px] font-semibold px-5"
                        >
                            Book a Demo
                        </Link>
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
                        <div className="flex items-center justify-between mb-4">
                            <ThemeToggle />
                        </div>
                        <nav aria-label="Primary" className="flex flex-col gap-1">
                            {NAV_LINKS.map((l, idx) => (
                                <Link
                                    key={l.label}
                                    to={l.to}
                                    onClick={() => setMobileOpen(false)}
                                    ref={idx === 0 ? firstMobileLink : null}
                                    className="py-2.5 text-[15px] text-ink-muted"
                                >
                                    {l.label}
                                </Link>
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
                            <Link
                                to="/contact"
                                onClick={() => setMobileOpen(false)}
                                className="btn-primary mt-3 block text-center rounded-lg px-5 py-3 text-[14px] font-semibold"
                            >
                                Book a Demo
                            </Link>
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
                        <div className="grid grid-cols-1 gap-12 items-center w-full">
                            <div>
                                <div className="hero-enter font-mono text-[12px] tracking-[0.14em] uppercase text-tap mb-5 inline-flex items-center gap-2.5" style={enter(0)}>
                                    <span className="relative flex h-2 w-2" aria-hidden="true">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tap opacity-60" />
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-tap" />
                                    </span>
                                    Omnitaps · All-in-one system for hospitality &amp; retail
                                </div>
                                <h1
                                    className="hero-enter font-display font-semibold text-[40px] leading-[1.08] sm:text-[52px] md:text-[56px] tracking-[-0.02em] text-ink mb-6 max-w-xl"
                                    style={enter(1)}
                                >
                                    One company. One system. Every part of your business.
                                </h1>
                                <p className="hero-enter text-[17px] leading-[1.6] text-ink-muted max-w-md mb-9" style={enter(2)}>
                                    Omnitaps is one company offering one packaged system — website, QR menus,
                                    ordering, reservations, reviews, Wi-Fi, loyalty, and support — all running on
                                    a single customer record instead of six separate vendors.
                                </p>
                                <div className="hero-enter flex flex-wrap items-center gap-3" style={enter(3)}>
                                    <Link to="/contact" className="btn-primary press-scale rounded-lg px-6 py-3.5 text-[15px] font-semibold inline-flex items-center gap-2">
                                        Get Started
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                                    </Link>
                                    <a href="#solutions" className="btn-ghost press-scale rounded-lg px-6 py-3.5 text-[15px] font-semibold">
                                        See what's included
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

                            {/* Connected-commerce visual with the live QR menu mini-demo */}
                            <div className={`hero-enter--zoom relative min-h-[26rem] sm:min-h-96 ${
                                demoPhase === "menu" || demoPhase === "error" ? "min-h-[41rem]" : ""
                            }`} style={enter(2)}>
                                <HeroCommerceVisual phase={demoPhase}>
                                    <HeroMenuDemo tenantId="demo" onPhaseChange={setDemoPhase} />
                                </HeroCommerceVisual>
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

                {/* ---------------- SOLUTIONS ---------------- */}
                <section id="solutions" className="max-w-6xl mx-auto px-5 sm:px-8 py-20 md:py-28 scroll-mt-20">
                <div className="reveal flex flex-col gap-7 md:flex-row md:items-end md:justify-between mb-12">
                    <div className="max-w-xl">
                        <div className="font-mono text-[12px] tracking-[0.14em] uppercase text-brass-dark mb-3">
                            What's in the package
                        </div>
                        <h2 className="font-display font-semibold text-[30px] md:text-[36px] tracking-[-0.01em] text-ink mb-4">
                            {PRODUCT_MODULE_COUNT} modules. One packaged system. Nothing to integrate.
                        </h2>
                        <p className="text-[16px] leading-[1.6] text-ink-muted">
                            Omnitaps sells one system, not a stack of tools. Every module below runs on the
                            same customer record, so a Wi-Fi login, a booking, and a review all build the same
                            picture of who walked in — one vendor, one console, one setup.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3 shrink-0">
                        <Link to="/contact" className="btn-primary press-scale rounded-lg px-6 py-3 text-[15px] font-semibold">
                            Book a demo
                        </Link>
                        <Link to="/demo" className="btn-ghost press-scale rounded-lg px-6 py-3 text-[15px] font-semibold">
                            Try demos
                        </Link>
                    </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" onPointerMove={onBentoPointerMove}>
                    {SERVICES.map((s, i) => (
                        <Link
                            to={`/items/${s.id}`}
                            key={s.id}
                            className="reveal-child bento-card group flex flex-col rounded-2xl border border-hairline bg-surface p-7 transition-colors hover:border-tap/40"
                            style={child(i)}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="bento-icon w-11 h-11 rounded-xl bg-tap-soft text-tap flex items-center justify-center">
                                    {icons[s.icon]({ className: "w-5 h-5" })}
                                </div>
                                <span className="font-mono text-[11px] tracking-[0.16em] text-ink-faint">
                                    {String(i + 1).padStart(2, "0")}
                                </span>
                            </div>
                            <h3 className="font-display font-semibold text-[17px] text-ink mb-2">
                                {s.title}
                            </h3>
                            <p className="text-[14.5px] leading-[1.6] text-ink-muted mb-6">{s.desc}</p>
                            <span className="mt-auto inline-flex w-fit items-center gap-2 rounded-lg border border-hairline px-3.5 py-2 text-[13px] font-semibold text-tap transition-colors group-hover:border-tap/40 group-hover:bg-tap-soft">
                                Explore
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
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
                            From six vendors to one packaged system, in three steps.
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

                {/* ---------------- CONTACT ---------------- */}
                <section
                    id="contact"
                    aria-labelledby="contact-heading"
                    className="max-w-6xl mx-auto px-5 sm:px-8 py-20 md:py-28 scroll-mt-20"
                >
                <div className="reveal--zoom reveal relative overflow-hidden rounded-3xl bg-ink px-8 py-16 md:px-16 md:py-20 text-center">
                    <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-tap opacity-20 blur-2xl" />
                    <div className="pointer-events-none absolute -bottom-24 -left-14 w-72 h-72 rounded-full bg-brass opacity-15 blur-2xl" />

                    <div className="relative">
                        <div className="font-mono text-[12px] tracking-[0.14em] uppercase text-white/45 mb-4">
                            Contact
                        </div>
                        <h2
                            id="contact-heading"
                            className="font-display font-semibold text-[30px] md:text-[42px] leading-[1.1] tracking-[-0.01em] text-white mb-5 max-w-2xl mx-auto"
                        >
                            Talk to a person, not a ticket queue.
                        </h2>
                        <p className="text-[16px] text-white/60 max-w-md mx-auto mb-10">
                            Questions, a walkthrough for your team, or a partnership — you reach the
                            people who build and run Omnitaps. We reply within one business day.
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                            <Link
                                to="/contact#contact-form"
                                className="btn-primary press-scale rounded-lg px-7 py-3.5 text-[15px] font-semibold inline-flex items-center gap-2"
                            >
                                Send a message
                                <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
                            </Link>
                            <Link
                                to="/demo"
                                className="btn-ghost press-scale rounded-lg px-7 py-3.5 text-[15px] font-semibold"
                            >
                                Try the demos
                            </Link>
                        </div>
                        <p className="mt-8 text-[13px] text-white/55">
                            Mon–Fri · 9:00–18:00 Pacific Time
                        </p>
                    </div>
                </div>

                <ul
                    aria-label="Direct contact channels"
                    className="reveal mt-4 grid gap-4 sm:grid-cols-3"
                >
                    {CONTACT_CHANNELS.map((channel) => (
                        <li key={channel.label}>
                            <a
                                href={channel.href}
                                {...(channel.external
                                    ? { target: "_blank", rel: "noreferrer noopener" }
                                    : {})}
                                className="bento-card group flex h-full flex-col rounded-2xl border border-hairline bg-surface p-6 transition-colors hover:border-tap/40"
                            >
                                <div className="mb-5 flex items-center justify-between">
                                    <span className="bento-icon grid h-11 w-11 place-items-center rounded-xl bg-tap-soft text-tap">
                                        <channel.icon size={18} strokeWidth={1.8} aria-hidden="true" />
                                    </span>
                                    <ArrowRight
                                        size={16}
                                        strokeWidth={2}
                                        aria-hidden="true"
                                        className="text-ink-faint transition-transform group-hover:translate-x-0.5"
                                    />
                                </div>
                                <div className="font-mono text-[11px] uppercase tracking-widest text-ink-faint">
                                    {channel.label}
                                </div>
                                <div className="mt-1 text-[15px] font-semibold text-ink break-all">
                                    {channel.value}
                                </div>
                                <p className="mt-1 text-[13px] text-ink-muted">{channel.hint}</p>
                            </a>
                        </li>
                    ))}
                </ul>
                </section>

            </main>

            <SiteFooter />
            </div>
        </>
    );
}
