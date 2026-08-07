import React, { useState } from "react";
import {
  Globe,
  QrCode,
  MessageSquareText,
  CalendarCheck,
  Star,
  Wifi,
  ArrowRight,
  Menu,
  X,
  Check,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  OmniTap — Brand tokens                                            */
/* ------------------------------------------------------------------ */
const BrandStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

    .omnitap-root {
      --bg: #F5F6F8;
      --surface: #FFFFFF;
      --ink: #10151F;
      --ink-muted: #5B6472;
      --border: #E4E7EC;
      --primary: #3A36E0;
      --primary-dark: #2620B8;
      --primary-tint: #EEEDFD;
      --signal: #FF8A34;
      --signal-tint: #FFF1E5;
      --dark-surface: #10142B;
      --dark-ink-muted: #9AA0C3;
      font-family: 'Inter', sans-serif;
      background: var(--bg);
      color: var(--ink);
    }
    .omnitap-root .font-display { font-family: 'Space Grotesk', sans-serif; }
    .omnitap-root .font-mono { font-family: 'JetBrains Mono', monospace; }

    .ripple-ring {
      position: absolute;
      border-radius: 9999px;
      border: 1.5px solid var(--primary);
      opacity: 0;
      animation: ripple 3.2s ease-out infinite;
    }
    .ripple-ring.delay-1 { animation-delay: 1.05s; }
    .ripple-ring.delay-2 { animation-delay: 2.1s; border-color: var(--signal); }

    @keyframes ripple {
      0%   { transform: scale(0.35); opacity: 0.65; }
      70%  { opacity: 0.12; }
      100% { transform: scale(1.6); opacity: 0; }
    }

    .tap-dot {
      animation: pulse-dot 3.2s ease-in-out infinite;
    }
    @keyframes pulse-dot {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.12); }
    }

    @media (prefers-reduced-motion: reduce) {
      .ripple-ring, .tap-dot { animation: none !important; }
    }

    .card-lift {
      transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
    }
    .card-lift:hover {
      transform: translateY(-4px);
      box-shadow: 0 20px 40px -20px rgba(16, 21, 31, 0.18);
      border-color: var(--primary);
    }

    .btn-primary {
      background: var(--primary);
      color: #fff;
      transition: background 0.2s ease, transform 0.2s ease;
    }
    .btn-primary:hover { background: var(--primary-dark); transform: translateY(-1px); }

    .btn-outline {
      border: 1.5px solid var(--border);
      color: var(--ink);
      transition: border-color 0.2s ease, background 0.2s ease;
    }
    .btn-outline:hover { border-color: var(--primary); background: var(--primary-tint); }

    .nav-link {
      color: var(--ink-muted);
      transition: color 0.2s ease;
    }
    .nav-link:hover { color: var(--ink); }

    .focus-ring:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
    }
  `}</style>
);

/* ------------------------------------------------------------------ */
/*  Logo mark                                                         */
/* ------------------------------------------------------------------ */
const Logo = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="13" cy="27" r="4.5" fill="#3A36E0" />
    <path d="M19.5 27C19.5 20.6487 24.6487 15.5 31 15.5" stroke="#3A36E0" strokeWidth="3.2" strokeLinecap="round" />
    <path d="M19.5 33.5C19.5 23.2827 27.7827 15 38 15" stroke="#FF8A34" strokeWidth="3.2" strokeLinecap="round" opacity="0.5" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Data                                                              */
/* ------------------------------------------------------------------ */
const NAV_LINKS = [
  { label: "Solutions", href: "#solutions" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Results", href: "#results" },
];

const SERVICES = [
  {
    icon: Globe,
    title: "Custom Websites",
    desc: "Fast, SEO-optimized, mobile-first sites built for venues — live in days, not months.",
    span: "md:col-span-1",
  },
  {
    icon: QrCode,
    title: "Dynamic QR Menus",
    desc: "Edit dishes and prices in real time. Guests always see the current menu, no reprints.",
    span: "md:col-span-1",
  },
  {
    icon: MessageSquareText,
    title: "AI Customer Service Chatbot",
    desc: "Deployed on your website and WhatsApp, it answers hours, directions, and menu questions instantly — so your staff can focus on the floor, not the phone.",
    span: "md:col-span-2",
    featured: true,
  },
  {
    icon: CalendarCheck,
    title: "Smart Reservations",
    desc: "Guests book in seconds. Confirmations and reminders go out automatically.",
    span: "md:col-span-1",
  },
  {
    icon: Star,
    title: "Google Maps Review Engine",
    desc: "Happy guests get funneled to a 5-star review. Unhappy ones reach you privately, first.",
    span: "md:col-span-1",
  },
  {
    icon: Wifi,
    title: "QR Wi-Fi Gateway",
    desc: "Guests get online with one tap. You capture the email or phone that connected them.",
    span: "md:col-span-2",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Deploy",
    desc: "Your site, menu, chatbot, and Wi-Fi gateway go live on OmniTap's infrastructure — no dev team required.",
  },
  {
    n: "02",
    title: "Connect",
    desc: "One QR code at the table links the menu, the reservation flow, and the Wi-Fi login into a single guest touchpoint.",
  },
  {
    n: "03",
    title: "Capture",
    desc: "Every visit — a Wi-Fi login, a booking, a chatbot chat — adds a real contact to a database you own.",
  },
  {
    n: "04",
    title: "Grow",
    desc: "Review funnels lift your Google rating. Your contact list turns first-time guests into repeat ones.",
  },
];

/* ------------------------------------------------------------------ */
/*  Root component                                                    */
/* ------------------------------------------------------------------ */
export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="omnitap-root min-h-screen w-full">
      <BrandStyles />

      {/* ---------------- NAV ---------------- */}
      <header className="sticky top-0 z-50" style={{ background: "rgba(245,246,248,0.85)", backdropFilter: "blur(8px)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2 focus-ring rounded-md">
            <Logo size={30} />
            <span className="font-display font-semibold text-lg tracking-tight">OmniTap</span>
          </a>

          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href} className="nav-link text-sm font-medium focus-ring rounded-md">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:block">
            <a
              href="#book-demo"
              className="btn-primary px-4 py-2.5 rounded-lg text-sm font-semibold inline-flex items-center gap-1.5 focus-ring"
            >
              Book a Demo
            </a>
          </div>

          <button
            className="md:hidden p-2 -mr-2 focus-ring rounded-md"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden px-6 pb-6 flex flex-col gap-4" style={{ borderTop: "1px solid var(--border)" }}>
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href} className="nav-link text-sm font-medium pt-4" onClick={() => setMobileOpen(false)}>
                {l.label}
              </a>
            ))}
            <a href="#book-demo" className="btn-primary px-4 py-3 rounded-lg text-sm font-semibold text-center">
              Book a Demo
            </a>
          </div>
        )}
      </header>

      {/* ---------------- HERO ---------------- */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 md:pt-24 md:pb-28 grid md:grid-cols-2 gap-14 items-center">
        <div>
          <div className="font-mono text-xs tracking-widest uppercase inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6" style={{ background: "var(--primary-tint)", color: "var(--primary)" }}>
            Digital infrastructure for hospitality & retail
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.4rem] leading-[1.08] font-semibold tracking-tight mb-6">
            Run your entire venue<br />with one tap.
          </h1>
          <p className="text-lg leading-relaxed mb-8" style={{ color: "var(--ink-muted)", maxWidth: "34rem" }}>
            OmniTap replaces six disconnected vendors with one platform — your website,
            menu, reservations, reviews, chatbot, and guest Wi-Fi, all working together.
          </p>
          <div className="flex flex-wrap gap-3 mb-10">
            <a href="#book-demo" className="btn-primary px-6 py-3.5 rounded-lg font-semibold inline-flex items-center gap-2 focus-ring">
              Get Started <ArrowRight size={18} />
            </a>
            <a href="#solutions" className="btn-outline px-6 py-3.5 rounded-lg font-semibold focus-ring">
              View Solutions
            </a>
          </div>
          <div className="flex items-center gap-3 font-mono text-xs" style={{ color: "var(--ink-muted)" }}>
            <span className="flex -space-x-2">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-6 h-6 rounded-full" style={{ background: "var(--primary-tint)", border: "2px solid var(--bg)" }} />
              ))}
            </span>
            TRUSTED BY 200+ INDEPENDENT VENUES
          </div>
        </div>

        {/* Tap ripple signature visual */}
        <div className="relative hidden md:flex items-center justify-center h-96">
          <div className="ripple-ring" style={{ width: 120, height: 120 }} />
          <div className="ripple-ring delay-1" style={{ width: 120, height: 120 }} />
          <div className="ripple-ring delay-2" style={{ width: 120, height: 120 }} />
          <div
            className="tap-dot relative z-10 rounded-2xl flex items-center justify-center"
            style={{ width: 88, height: 88, background: "var(--surface)", boxShadow: "0 24px 48px -18px rgba(16,21,31,0.25)", border: "1px solid var(--border)" }}
          >
            <Logo size={40} />
          </div>

          <div
            className="absolute bottom-4 left-2 rounded-xl px-4 py-3 font-mono text-xs"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 16px 32px -16px rgba(16,21,31,0.2)" }}
          >
            <div className="flex items-center gap-1.5" style={{ color: "var(--primary)" }}>
              <Check size={14} /> Table 12 checked in
            </div>
          </div>

          <div
            className="absolute top-6 right-0 rounded-xl px-4 py-3 font-mono text-xs"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 16px 32px -16px rgba(16,21,31,0.2)" }}
          >
            <div className="flex items-center gap-1.5" style={{ color: "var(--signal)" }}>
              <Star size={14} fill="var(--signal)" /> New 5★ review
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- SERVICES ---------------- */}
      <section id="solutions" className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <div className="max-w-xl mb-12">
          <div className="font-mono text-xs tracking-widest uppercase mb-3" style={{ color: "var(--signal)" }}>
            The platform
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mb-4">
            Six tools. One guest journey.
          </h2>
          <p className="text-base" style={{ color: "var(--ink-muted)" }}>
            Every OmniTap module shares one guest database, so a Wi-Fi login, a booking,
            and a review all build the same picture of your customer.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {SERVICES.map(({ icon: Icon, title, desc, span, featured }) => (
            <div
              key={title}
              className={`card-lift rounded-2xl p-7 ${span}`}
              style={{
                background: featured ? "var(--dark-surface)" : "var(--surface)",
                border: featured ? "1px solid var(--dark-surface)" : "1px solid var(--border)",
                color: featured ? "#fff" : "var(--ink)",
              }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                style={{ background: featured ? "rgba(255,255,255,0.08)" : "var(--primary-tint)" }}
              >
                <Icon size={20} color={featured ? "#fff" : "var(--primary)"} />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: featured ? "var(--dark-ink-muted)" : "var(--ink-muted)" }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- HOW IT WORKS ---------------- */}
      <section id="how-it-works" className="py-20 md:py-28" style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-xl mb-14">
            <div className="font-mono text-xs tracking-widest uppercase mb-3" style={{ color: "var(--primary)" }}>
              How it works
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
              From setup to repeat guests, in four steps.
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {STEPS.map((s, i) => (
              <div key={s.n} className="relative pl-0">
                <div className="font-display text-3xl font-semibold mb-4" style={{ color: "var(--primary-tint)", WebkitTextStroke: "1.5px var(--primary)" }}>
                  {s.n}
                </div>
                <h3 className="font-display font-semibold text-base mb-2">{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--ink-muted)" }}>
                  {s.desc}
                </p>
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-3 right-[-1rem] w-4 h-px" style={{ background: "var(--border)" }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- RESULTS / BOTTOM CTA ---------------- */}
      <section id="results" className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <div
          id="book-demo"
          className="rounded-3xl px-8 py-16 md:px-16 md:py-20 text-center relative overflow-hidden"
          style={{ background: "var(--dark-surface)" }}
        >
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-20" style={{ background: "var(--primary)" }} />
          <div className="absolute -bottom-20 -left-10 w-64 h-64 rounded-full opacity-10" style={{ background: "var(--signal)" }} />

          <div className="relative">
            <h2 className="font-display text-3xl md:text-[2.6rem] leading-tight font-semibold text-white mb-5 max-w-2xl mx-auto">
              Your venue, fully tapped in.
            </h2>
            <p className="mb-10 max-w-lg mx-auto" style={{ color: "var(--dark-ink-muted)" }}>
              Book a 20-minute demo. We'll show you your website, menu, and chatbot
              running on OmniTap before the call ends.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <a href="#" className="btn-primary px-7 py-3.5 rounded-lg font-semibold inline-flex items-center gap-2 focus-ring">
                Get Started <ArrowRight size={18} />
              </a>
              <a
                href="#solutions"
                className="px-7 py-3.5 rounded-lg font-semibold focus-ring"
                style={{ border: "1.5px solid rgba(255,255,255,0.2)", color: "#fff" }}
              >
                View Solutions
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- FOOTER ---------------- */}
      <footer style={{ borderTop: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto px-6 py-14 grid md:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Logo size={26} />
              <span className="font-display font-semibold">OmniTap</span>
            </div>
            <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
              Digital infrastructure for hospitality & retail.
            </p>
          </div>

          <div>
            <div className="font-mono text-xs uppercase tracking-widest mb-4" style={{ color: "var(--ink-muted)" }}>Platform</div>
            <ul className="space-y-2.5 text-sm">
              {["Websites", "QR Menus", "AI Chatbot", "Reservations"].map((t) => (
                <li key={t}><a href="#solutions" className="nav-link">{t}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <div className="font-mono text-xs uppercase tracking-widest mb-4" style={{ color: "var(--ink-muted)" }}>Company</div>
            <ul className="space-y-2.5 text-sm">
              {["About", "Careers", "Contact"].map((t) => (
                <li key={t}><a href="#" className="nav-link">{t}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <div className="font-mono text-xs uppercase tracking-widest mb-4" style={{ color: "var(--ink-muted)" }}>Legal</div>
            <ul className="space-y-2.5 text-sm">
              {["Privacy", "Terms", "Security"].map((t) => (
                <li key={t}><a href="#" className="nav-link">{t}</a></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-6 text-xs flex flex-col sm:flex-row justify-between gap-2" style={{ borderTop: "1px solid var(--border)", color: "var(--ink-muted)" }}>
          <span>© {new Date().getFullYear()} OmniTap, Inc. All rights reserved.</span>
          <span className="font-mono">Made for venues that never close.</span>
        </div>
      </footer>
    </div>
  );
}
