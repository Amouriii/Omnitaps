import { Link } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { items as SERVICES } from "../data/items";
import useScrollReveal, { useBentoPointerGlow } from "../hooks/useScrollReveal";

const VALUES = [
    {
        title: "One platform, one customer record",
        desc: "A WiFi login, a booking, and a review all build the same picture of who walked in — no syncing between six different tools.",
    },
    {
        title: "Live in an afternoon",
        desc: "Add Omnitaps to your site, tables, and entrance without developers, hardware, or downtime.",
    },
    {
        title: "Built to never close",
        desc: "Chatbots answer, reservations fill themselves in, and WiFi connects guests while your team sleeps.",
    },
];

const AUDIENCES = ["Cafés", "Boutique hotels", "Restaurants", "Retail chains"];

export default function About() {
    const rootRef = useScrollReveal();
    const onBentoPointerMove = useBentoPointerGlow();
    const child = (i) => ({ "--child-delay": `${i * 90}ms` });

    return (
        <main id="main" ref={rootRef} className="min-h-screen bg-porcelain text-ink font-body" tabIndex="-1">
            <SiteHeader />

            {/* ---------------- HERO ---------------- */}
            <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-16 pb-12 md:pt-24 md:pb-16">
                <div className="max-w-2xl">
                    <div className="reveal font-mono text-[12px] tracking-[0.14em] uppercase text-tap mb-5">
                        About Omnitaps
                    </div>
                    <h1 className="reveal font-display font-semibold text-[36px] leading-[1.1] sm:text-[48px] md:text-[52px] tracking-[-0.02em] text-ink mb-6" style={{ "--reveal-delay": "90ms" }}>
                        Digital infrastructure for hospitality &amp; retail.
                    </h1>
                    <p className="reveal text-[17px] leading-[1.6] text-ink-muted max-w-xl mb-9" style={{ "--reveal-delay": "180ms" }}>
                        Omnitaps replaces the six different logins, vendors, and subscriptions running
                        your restaurant or store with a single connected platform — websites, menus,
                        reservations, reviews, WiFi, and support. Every module shares the same customer
                        record, so one tap connects your whole operation.
                    </p>
                    <div className="reveal flex flex-wrap items-center gap-3" style={{ "--reveal-delay": "270ms" }}>
                        <Link
                            to="/contact"
                            className="btn-primary rounded-lg px-6 py-3.5 text-[15px] font-semibold inline-flex items-center gap-2"
                        >
                            Talk to us
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                        </Link>
                        <Link to="/demo" className="btn-ghost rounded-lg px-6 py-3.5 text-[15px] font-semibold">
                            Try demos
                        </Link>
                    </div>
                </div>
            </section>

            {/* ---------------- VALUES ---------------- */}
            <section className="border-y border-hairline bg-surface">
                <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 md:py-20">
                    <div className="reveal max-w-xl mb-12">
                        <div className="font-mono text-[12px] tracking-[0.14em] uppercase text-tap mb-3">
                            Why Omnitaps
                        </div>
                        <h2 className="font-display font-semibold text-[30px] md:text-[36px] tracking-[-0.01em] text-ink">
                            One connected platform, not a stack of tools.
                        </h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-10 md:gap-8">
                        {VALUES.map((v, i) => (
                            <div key={v.title} className="reveal-child" style={child(i)}>
                                <div className="font-display text-[20px] font-semibold text-tap-soft mb-4"
                                    style={{ WebkitTextStroke: "1.5px var(--color-tap)" }}
                                >
                                    {String(i + 1).padStart(2, "0")}
                                </div>
                                <h3 className="font-display font-semibold text-[18px] text-ink mb-2">
                                    {v.title}
                                </h3>
                                <p className="text-[14.5px] leading-[1.6] text-ink-muted max-w-xs">
                                    {v.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ---------------- PRODUCTS ---------------- */}
            <section className="max-w-6xl mx-auto px-5 sm:px-8 py-20 md:py-28">
                <div className="reveal max-w-xl mb-12">
                    <div className="font-mono text-[12px] tracking-[0.14em] uppercase text-brass-dark mb-3">
                        Products &amp; services
                    </div>
                    <h2 className="font-display font-semibold text-[30px] md:text-[36px] tracking-[-0.01em] text-ink mb-4">
                        Six tools your team already needs. One place to run them.
                    </h2>
                    <p className="text-[16px] leading-[1.6] text-ink-muted">
                        Here is what we build — and what each module does for your business.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4" onPointerMove={onBentoPointerMove}>
                    {SERVICES.map((s, i) => (
                        <Link
                            to={`/items/${s.id}`}
                            key={s.id}
                            className="reveal-child bento-card block cursor-pointer rounded-2xl border border-hairline bg-surface p-7"
                            style={child(i)}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <span className="font-mono text-[12px] tracking-widest text-ink-faint">
                                    {String(i + 1).padStart(2, "0")}
                                </span>
                                <span className="card-dot w-1.5 h-1.5 rounded-full bg-hairline-strong" />
                            </div>
                            <h3 className="font-display font-semibold text-[17px] text-ink mb-2">
                                {s.title}
                            </h3>
                            <p className="text-[14.5px] leading-[1.6] text-ink-muted">{s.desc}</p>
                        </Link>
                    ))}
                </div>
            </section>

            {/* ---------------- AUDIENCES ---------------- */}
            <section className="border-y border-hairline bg-surface">
                <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 md:py-20">
                    <div className="reveal">
                        <div className="font-mono text-[12px] tracking-[0.14em] uppercase text-tap mb-3">
                            Built for
                        </div>
                        <h2 className="font-display font-semibold text-[30px] md:text-[36px] tracking-[-0.01em] text-ink mb-6">
                            Businesses that never close.
                        </h2>
                        <ul className="flex flex-wrap gap-3">
                            {AUDIENCES.map((a, i) => (
                                <li
                                    key={a}
                                    className="reveal-child rounded-full border border-hairline bg-porcelain px-4 py-2 text-[14px] font-medium text-ink-muted"
                                    style={child(i)}
                                >
                                    {a}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            {/* ---------------- CTA ---------------- */}
            <section className="max-w-6xl mx-auto px-5 sm:px-8 py-20 md:py-28">
                <div className="reveal relative overflow-hidden rounded-3xl bg-ink px-8 py-14 md:px-16 md:py-16 text-center">
                    <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-tap opacity-20 blur-2xl" />
                    <div className="pointer-events-none absolute -bottom-24 -left-14 w-72 h-72 rounded-full bg-brass opacity-15 blur-2xl" />

                    <div className="relative">
                        <h2 className="font-display font-semibold text-[28px] md:text-[38px] leading-[1.1] tracking-[-0.01em] text-white mb-4 max-w-xl mx-auto">
                            Ready to run your business on one tap?
                        </h2>
                        <p className="text-[16px] text-white/60 max-w-md mx-auto mb-8">
                            Questions, demos, or partnerships — we are one message away.
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                            <Link to="/contact" className="btn-primary rounded-lg px-7 py-3.5 text-[15px] font-semibold">
                                Get Started
                            </Link>
                            <Link
                                to="/demo"
                                className="rounded-lg px-7 py-3.5 text-[15px] font-semibold text-white border border-white/20 hover:border-white/40 transition-colors"
                            >
                                Try demos
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <SiteFooter />
        </main>
    );
}
