import { useEffect, useRef, useState } from "react";
import {
  Airplay, BookOpen, CreditCard, Cpu, FileQuestion, Headphones,
  Hotel, Infinity, Lightbulb, MapPin, Moon, MoveHorizontal,
  Pizza, QrCode, Swords, Monitor, Smartphone, Tv, Wifi,
  Palette, Wrench, Zap, ChevronRight, X, CheckCircle2, Loader2,
  Music2, Phone, Menu as MenuIcon, Globe, MessageCircle, BarChart3,
  ShieldCheck, Users, Calendar, Award, Utensils, Link as LinkIcon,
  Coffee,
} from "lucide-react";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

const SUITE = [
  { id: "cafe", label: "Demo Café", icon: Coffee, href: "/menu/demo", role: "guest" },
  { id: "wallet", label: "Wallet", icon: CreditCard, href: "/demo/wallet", role: "guest" },
  { id: "loyalty", label: "Loyalty", icon: Award, href: "/demo/loyalty", role: "guest" },
  { id: "wifi", label: "Wi‑Fi", icon: Wifi, href: "/r/demo/wifi", role: "guest" },
  { id: "reviews", label: "Reviews", icon: MessageCircle, href: "/r/demo/review", role: "guest" },
  { id: "website", label: "Website", icon: Globe, href: "/s/demo", role: "guest" },
  { id: "ordering", label: "Order", icon: Utensils, href: "/demo/koffee-kulture", role: "guest" },
  { id: "admin", label: "Admin", icon: BarChart3, href: "/demo/dashboard", role: "operator" },
];

const GLOW = [
  { accent: "#155eef", x: "12%", y: "8%", w: 34, h: 34, opacity: "0.55" },
  { accent: "#b8873b", x: "74%", y: "70%", w: 40, h: 40, opacity: "0.45" },
  { accent: "#c45c26", x: "42%", y: "46%", w: 22, h: 22, opacity: "0.30" },
];

const DETAILS = {
  cafe: {
    title: "Scan-to-order café",
    body: "Harbor Lane Demo Café: menu, QR menu, Wi‑Fi splash, and a chatbot that answers from seeded knowledge.",
    tags: ["QR menu", "Wi‑Fi", "Chatbot"],
    owner: "Demo Café · Harbor Lane",
  },
  wallet: {
    title: "Digital membership card",
    body: "Rewards, gym, or sports-club pass with QR, PDF417, Code 128, or Aztec. Pause or revoke from the operator console without changing the customer experience.",
    tags: ["QR & barcodes", "Live status", "Branded to you"],
    owner: "Apple Wallet membership module",
  },
  loyalty: {
    title: "Points that feel personal",
    body: "Visits, spend, referrals, and reviews feed one balance. Tiers, progress, and Wallet updates give people a reason to return.",
    tags: ["Earn automatically", "Redeem anywhere", "Live data"],
    owner: "Loyalty module (migration 010)",
  },
  wifi: {
    title: "Guest Wi‑Fi that captures",
    body: "QR on the table, splash with optional identity, paid upgrades with Stripe, and owner telemetry for active sessions and devices.",
    tags: ["QR join", "OTP identity", "Stripe checkout"],
    owner: "Captive Wi‑Fi module",
  },
  reviews: {
    title: "Review funnel",
    body: "4–5 stars continue to Google. 1–3 stars open a private form for the café team, so feedback never disappears.",
    tags: ["Star routing", "Private feedback", "Google handoff"],
    owner: "Review gate module",
  },
  website: {
    title: "Café website + chat",
    body: "Hours, map, menu embed, and a chatbot grounded in seeded HOURS, MENU, WIFI, and FAQ knowledge.",
    tags: ["Own site", "Menu embed", "LLM chat"],
    owner: "Website + chatbot modules",
  },
  ordering: {
    title: "Direct ordering & reservations",
    body: "Order from the menu board, reserve a table, and pay at the counter. This demo surfaces the Koffee Kulture brand experience.",
    tags: ["Order panel", "Reservations", "Locations"],
    owner: "Ordering brand demo",
  },
  admin: {
    title: "Operator console",
    body: "One view for the owner: Wi‑Fi connections, live Stripe payments, and orders from Wi‑Fi plans plus QR menu scans.",
    tags: ["Insights", "Live payments", "Orders"],
    owner: "Enterprise console demo",
  },
};

export default function DemoApp() {
  const [tour, setTour] = useState(false);
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [emailState, setEmailState] = useState("idle");
  const [copied, setCopied] = useState(false);
  const rootRef = useRef(null);

  const screens = SUITE.map((s) => s.id);

  const now = new Date();
  const time = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const battery = 87;
  const bars = Math.floor((battery / 100) * 5);

  const activeId = screens[step % screens.length];

  useEffect(() => {
    if (tour) {
      setStep(0);
    } else {
      setStep((current) => current % screens.length);
    }
  }, [tour]);

  const next = () => {
    if (tour) {
      if (step >= screens.length - 1) {
        setTour(false);
        setStep(0);
      } else {
        setStep((s) => s + 1);
      }
    }
  };

  const prev = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const sendEmail = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setEmailState("submitting");
    try {
      const body = { name: "", email: email.trim(), company: "", message: "I'd like the OmniTaps app demo for my business." };
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setEmailState("success");
      } else {
        setEmailState("error");
      }
    } catch {
      setEmailState("error");
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/demo/app`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink text-white font-body">
      <SiteHeader showTryDemos={false} />

      <main ref={rootRef} className="relative flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
        {/* ambient glow */}
        {GLOW.map((g, i) => (
          <div
            key={i}
            className="pointer-events-none rounded-full blur-3xl"
            style={{
              position: "absolute",
              left: g.x,
              top: g.y,
              width: `${g.w}rem`,
              height: `${g.h}rem`,
              background: g.accent,
              opacity: g.opacity,
            }}
          />
        ))}

        <div className="relative z-10 flex max-w-5xl flex-col items-center gap-10 text-center sm:gap-14">
          {/* headline */}
          <div className="max-w-2xl text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-tap">App demo</p>
            <h1 className="mt-4 font-display text-[40px] font-semibold leading-[1.04] tracking-[-0.03em] sm:text-[58px]">
              Your hospitality app, end to end.
            </h1>
            <p className="mt-5 max-w-xl text-[16px] leading-[1.7] text-white/70 sm:text-[17px]">
              Hand a prospect a phone and walk the guest experience and the operator console in a few minutes — menu, Wallet, loyalty, Wi‑Fi, reviews, website, ordering, and the owner dashboard.
            </p>
          </div>

          {/* phone frame */}
          <div className="relative flex w-full max-w-sm flex-col overflow-hidden rounded-[42px] bg-black/50 psm:max-w-sm shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] sm:shadow-[0_40px_100px_-30px_rgba(0,0,0,0.85)]">
            {/* notch / dynamic island */}
            <div className="flex items-center justify-between border-b border-white/10 bg-black px-5 py-3 sm:px-6 sm:py-3.5">
              <span className="flex items-center gap-2 text-[11px] font-mono text-white/60">
                <span className="inline-block h-2 w-2 rounded-full bg-white/40" />
                {time}
              </span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-0.5 text-[10px] text-white/50" aria-label="Wi-Fi">
                  <svg width="14" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2" />
                    <path d="M7 12l4 4" />
                  </svg>
                </span>
                <span className="flex items-center gap-0.5 text-[10px] text-white/50" aria-label="Battery">
                  <svg width="14" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <rect x="2" y="7" width="16" height="10" rx="2" />
                    <rect x="20" y="10" width="2" height="4" rx="1" fill="currentColor" />
                    <rect x="4" y="9" width={`${bars * 3 + 1.2}`} height="6" rx="1" fill="currentColor" />
                  </svg>
                </span>
                <div className="flex h-6 w-16 items-center justify-center rounded-full bg-black/40 ring-1 ring-white/20">
                  <span className="text-[10px] font-medium text-white/70">9:41</span>
                </div>
              </div>
            </div>

            {/* screen */}
            <div className="flex-1 overflow-hidden bg-[#0b0d11]">
              <div className="h-full overflow-y-auto scrollbar-hide">
                <div className="min-h-screen bg-[#0b0d11] px-4 pb-24 pt-3 text-left">
                  {/* status line */}
                  <div className="flex items-center justify-between text-[10px] text-white/40">
                    <span>Wednesday, November 19</span>
                    <span>{activeId === "admin" ? "Operator" : "Guest"} demo</span>
                  </div>

                  {/* content */}
                  <div className="mt-4 border-t border-white/10 pt-4">
                    {activeId === "home" ? (
                      <HomeScreen
                        activeId={activeId}
                        setStep={setStep}
                        step={step}
                        screens={screens}
                        tour={tour}
                        setTour={setTour}
                      />
                    ) : (
                      <AppScreen
                        id={activeId}
                        detail={DETAILS[activeId]}
                        index={step % screens.length}
                        total={screens.length}
                        onPrev={prev}
                        onNext={next}
                        tour={tour}
                        setTour={setTour}
                        step={step}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* home indicator */}
            <div className="flex justify-center pb-3 pt-2">
              <div className="h-1 w-12 rounded-full bg-white/30" />
            </div>

            {/* tab bar */}
            <div className="flex shrink-0 rounded-b-2xl border-t border-white/10 bg-black/60 p-1.5 backdrop-blur-sm">
              {SUITE.map((s) => {
                const Icon = s.icon;
                const active = activeId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setTour(false);
                      setStep(SUITE.findIndex((x) => x.id === s.id));
                    }}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[11px] ${
                      active
                        ? "bg-white/10 text-white shadow-inner"
                        : "text-white/50 hover:text-white/80"
                    }`}
                  >
                    <Icon size={16} strokeWidth={1.7} />
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* caption */}
          <p className="max-w-lg text-[13px] leading-[1.6] text-white/60 sm:text-[14px]">
            Slide <span className="font-mono text-white/80">{step + 1}</span> of{" "}
            <span className="font-mono text-white/80">{screens.length}</span> —{" "}
            {activeId === "admin" ? "operator console" : DETAILS[activeId].owner}.
          </p>
        </div>

        {/* tour toolbar */}
        {tour ? (
          <div className="flex items-center gap-4">
            <p className="text-[13px] text-white/60">Guided tour — each screen visits a real part of the suite.</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTour(false)}
                className="rounded-xl border border-white/20 px-4 py-2 text-[13px] font-medium text-white/80 hover:bg-white/10"
              >
                Exit tour
              </button>
              <button
                type="button"
                onClick={prev}
                disabled={step === 0}
                className="rounded-xl border border-white/20 px-4 py-2 text-[13px] font-medium text-white/80 disabled:opacity-40 hover:bg-white/10"
              >
                Back
              </button>
              <button
                type="button"
                onClick={next}
                className="rounded-xl bg-tap px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90"
              >
                {step >= screens.length - 1 ? "Finish tour" : "Next"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setTour(true)}
              className="rounded-xl border border-white/20 px-4 py-2 text-[13px] font-medium text-white/80 hover:bg-white/10"
            >
              Start guided tour
            </button>
            <button
              type="button"
              onClick={copyLink}
              className="rounded-xl border border-white/20 px-4 py-2 text-[13px] font-medium text-white/80 hover:bg-white/10"
            >
              {copied ? "Copied link" : "Copy demo link"}
            </button>
            <a
              href="/contact"
              className="rounded-xl bg-tap px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90"
            >
              Build this for my business
            </a>
          </div>
        )}

        {/* email capture for conversion */}
        <form
          onSubmit={sendEmail}
          className="mt-4 max-w-sm rounded-2xl border border-white/10 bg-white/5 p-4 text-left backdrop-blur-sm"
        >
          <p className="text-[12px] font-medium text-white/70">Want this demo on your own branding?</p>
          <div className="mt-2 flex gap-2">
            <input
              type="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailState !== "idle") setEmailState("idle");
              }}
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-tap"
            />
            <button
              type="submit"
              disabled={emailState === "submitting"}
              className="shrink-0 rounded-xl bg-tap px-3 py-2 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 hover:opacity-90"
            >
              {emailState === "submitting" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : emailState === "success" ? (
                <CheckCircle2 size={16} />
              ) : emailState === "error" ? (
                <X size={16} />
              ) : (
                <MessageCircle size={16} />
              )}
            </button>
          </div>
          {emailState === "success" ? (
            <p className="mt-2 text-[12px] text-emerald-400">Thanks — we'll be in touch.</p>
          ) : emailState === "error" ? (
            <p className="mt-2 text-[12px] text-amber-400">Couldn't send right now — email the team directly.</p>
          ) : null}
        </form>
      </main>

      <SiteFooter />
    </div>
  );
}

<<<<<<< HEAD
function HomeScreen({ activeId, setStep, step, screens, tour, setTour }) {
  return (
    <div className="py-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[20px] font-semibold tracking-[-0.02em]">OmniTaps Demo</h2>
        <button
          type="button"
          onClick={() => setTour(true)}
          className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-medium text-tap hover:bg-white/10"
        >
          Start tour
        </button>
      </div>

      <p className="mt-3 text-[13px] leading-[1.6] text-white/70">
        This phone runs the full OmniTaps suite as one app. Tap a tab to visit a real demo surface.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {[
          [QrCode, "Scan to order"],
          [CreditCard, "Wallet membership"],
          [Award, "Loyalty points"],
          [Wifi, "Guest Wi‑Fi"],
          [MessageCircle, "Reviews"],
          [Globe, "Website + chat"],
          [BarChart3, "Operator console"],
        ].map(([Icon, label]) => (
          <span
            key={label}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white/70"
          >
            <Icon size={12} strokeWidth={1.8} />
            {label}
          </span>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-[13px] text-white/60">
        <p className="font-medium text-white/80">First time here?</p>
        <p className="mt-1">Walk the guided tour to visit every screen in order — guest flows first, then the operator console.</p>
        <button
          type="button"
          onClick={() => setTour(true)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-tap px-3 py-1.5 text-[12px] font-semibold text-white hover:opacity-90"
        >
          <MoveHorizontal size={13} /> Start guided tour
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-[12px] text-white/60">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="font-medium text-white/80">Guest side</p>
          <p className="mt-1">Menu, Wallet, loyalty, Wi‑Fi, reviews, website, ordering.</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="font-medium text-white/80">Operator side</p>
          <p className="mt-1">Console with Wi‑Fi, payments, and orders in one view.</p>
        </div>
      </div>
    </div>
  );
}

function AppScreen({ id, detail, index, total, onPrev, onNext, tour, setTour }) {
  const href = SUITE_BY_ID[id]?.href;
  return (
    <div className="py-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-tap">{id}</p>
          <h2 className="mt-1 font-display text-[18px] font-semibold tracking-[-0.02em]">{detail.title}</h2>
        </div>
        <button
          type="button"
          onClick={() => setTour(true)}
          className="rounded-lg border border-white/10 px-2 py-1 text-[10px] font-medium text-tap hover:bg-white/10"
        >
          Tour
        </button>
      </div>

      <p className="mt-3 text-[12px] leading-[1.55] text-white/60">{detail.body}</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {detail.tags.map((t) => (
          <span
            key={t}
            className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-white/60"
          >
            {t}
          </span>
        ))}
      </div>

      {/* live / simulated honesty pill */}
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-300">
        <CheckCircle2 size={13} strokeWidth={2} />
        <span>Live demo surface — opens the real page inside the suite.</span>
      </div>

      {!PHONE_HOOKS[id] && href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-2 text-[12px] font-medium text-white hover:bg-white/20"
        >
          Open the real {id} demo ↗
        </a>
      ) : null}

      <div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-4 text-[11px] text-white/50">
        <button
          type="button"
          onClick={onPrev}
          disabled={!tour && index === 0}
          className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] disabled:opacity-30 hover:bg-white/10"
        >
          <ChevronRight size={14} className="rotate-180" /> Back
        </button>
        <span className="flex-1 text-center">
          {tour ? `Tour step ${index + 1} of ${total}` : `Demo ${index + 1} of ${total}`}
        </span>
        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-white hover:bg-white/10"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

const SUITE_BY_ID = Object.fromEntries(SUITE.map((s) => [s.id, s]));
