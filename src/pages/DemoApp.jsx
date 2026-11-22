import { useEffect, useRef, useState } from "react";
import {
  CreditCard, ChevronRight, X, CheckCircle2, Loader2,
  MessageCircle, BarChart3, ShieldCheck, Award, Utensils,
  Wifi, Globe, Coffee, MoveHorizontal, QrCode,
} from "lucide-react";
import { QrCodeSvg } from "../lib/qr";
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

const PHONE_HOOKS = {
  wallet: "Add to Apple Wallet",
  wifi: "Join guest Wi‑Fi",
  loyalty: "Check in at the counter",
};

const DETAILS = {
  cafe: {
    title: "Scan-to-order café",
    body: "Harbor Lane Demo Café: menu, QR menu, Wi‑Fi splash, and a chatbot that answers from seeded knowledge.",
    tags: ["QR menu", "Wi‑Fi", "Chatbot"],
    owner: "Demo Café · Harbor Lane",
  },
  wallet: {
    title: "Digital membership card",
    body: "Wallet hook: tap to open an Add to Apple Wallet sheet, then surface the membership QR in the loyalty counter check-in.",
    tags: ["QR & barcodes", "Add to Wallet", "Counter check-in"],
    owner: "Phone-native Wallet hook (simulated)",
  },
  loyalty: {
    title: "Points that feel personal",
    body: "Loyalty hook: earn points from counter visits and the Wallet pass is what the counter scans to recognize you.",
    tags: ["Earn at counter", "Wallet link", "Live data"],
    owner: "Phone-native loyalty hook (simulated)",
  },
  wifi: {
    title: "Guest Wi‑Fi that captures",
    body: "Wi‑Fi hook: tap to join the guest network from the phone — QR, password, and OTP identity echo in this simulated demo.",
    tags: ["QR join", "OTP identity", "Simulated join"],
    owner: "Phone-native Wi‑Fi hook (simulated)",
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
  const [hookScreen, setHookScreen] = useState(null);
  const rootRef = useRef(null);

  const screens = SUITE.map((s) => s.id);

  const now = new Date();
  const time = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const battery = 87;
  const bars = Math.floor((battery / 100) * 5);

  const activeId = hookScreen ?? screens[step % screens.length];

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

  const openHook = (hook) => {
    setTour(false);
    setHookScreen(hook);
  };

  const closeHook = () => {
    setHookScreen(null);
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
          <div className="peer relative flex w-full max-w-sm flex-col overflow-hidden rounded-[42px] bg-black/50 psm:max-w-sm shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] sm:shadow-[0_40px_100px_-30px_rgba(0,0,0,0.85)]">
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
                    <span>Wednesday, December 11</span>
                    <span>{activeId === "admin" ? "Operator" : "Guest"} demo</span>
                  </div>

                  {/* content */}
                  <div className="mt-4 border-t border-white/10 pt-4">
                    {activeId === "home" ? (
                      <HomeScreen
                        openHook={openHook}
                      />
                    ) : activeId === "wallet" || activeId === "wifi" || activeId === "loyalty" ? (
                      <PhoneHookScreen
                        hook={activeId}
                        onClose={closeHook}
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
                      />
                    )}
                  </div>
                  {hookScreen === "wallet" ? (
                    <div className="absolute right-3 top-3 z-20 border border-white/10 rounded-full bg-[#0b0d11]/60 p-1" onClick={() => setHookScreen(null)} aria-label="Close Wallet hook">
                      <X size={16} className="text-white/70 hover:text-white" />
                    </div>
                  ) : hookScreen === "wifi" ? (
                    <div className="absolute right-3 top-3 z-20 border border-white/10 rounded-full bg-[#0b0d11]/60 p-1" onClick={() => setHookScreen(null)} aria-label="Close Wi‑Fi hook">
                      <X size={16} className="text-white/70 hover:text-white" />
                    </div>
                  ) : hookScreen === "loyalty" ? (
                    <div className="absolute right-3 top-3 z-20 border border-white/10 rounded-full bg-[#0b0d11]/60 p-1" onClick={() => setHookScreen(null)} aria-label="Close loyalty hook">
                      <X size={16} className="text-white/70 hover:text-white" />
                    </div>
                  ) : null}
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
                      if (PHONE_HOOKS[s.id]) {
                        openHook(s.id);
                      } else {
                        setTour(false);
                        setStep(SUITE.findIndex((x) => x.id === s.id));
                      }
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

      {/* live / simulated honesty pill for non-hook tabs */}
      {!PHONE_HOOKS[id] ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-300">
          <CheckCircle2 size={13} strokeWidth={2} />
          <span>Live demo surface — opens the real page inside the suite.</span>
        </div>
      ) : null}

      {/* phone-native hook CTA for Wallet / Wi‑Fi / Loyalty */}
      {PHONE_HOOKS[id] ? (
        <div className="mt-4 flex flex-col gap-3 border border-tap/20 rounded-xl bg-tap/10 p-4 text-[12px] text-tap">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-white">Tap to open the phone-native hook</span>
            <span className="text-[10px] text-tap/70">{PHONE_HOOKS[id]} →</span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (PHONE_HOOKS[id]) openHook(id);
            }}
            className="rounded-lg bg-tap px-3 py-2 text-[12px] font-semibold text-white shadow-inner"
          >
            Open {PHONE_HOOKS[id]}
          </button>
          <p className="text-[11px] text-tap/70">
            {id === "wallet"
              ? "Simulated Apple Wallet sheet. Nothing is signed or issued unless the wallet signing keys are configured."
              : id === "wifi"
              ? "Captive-style join screen. OTP echoes in dev; real paid upgrades need Stripe wired."
              : "Simulated loyalty → Wallet → counter check-in loop so you can trace one guest visit end to end."}
          </p>
        </div>
      ) : null}

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

function HomeScreen({ openHook }) {
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
        This phone runs the full OmniTaps suite as one app. The Wallet, Loyalty, and Wi‑Fi tabs open phone-native interactions — in this demo they are simulated inside the phone frame.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {[
          [QrCode, "Scan to order"],
          [CreditCard, "Wallet → Add to Wallet"],
          [Award, "Loyalty → counter check-in"],
          [Wifi, "Guest Wi‑Fi → join"],
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
        <p className="font-medium text-white/80">Three phone-native hooks</p>
        <p className="mt-1">
          In a live app these would open the real Wallet sheet, the captive Wi‑Fi join, and the counter check-in. Here they run as simulated screens inside the phone frame, honest about what is live and what is preview.
        </p>
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

function PhoneHookScreen({ hook, onClose }) {
  if (hook === "wallet") {
    return <WalletHook onClose={onClose} />;
  }

  if (hook === "wifi") {
    return <WifiHook onClose={onClose} />;
  }

  if (hook === "loyalty") {
    return <LoyaltyHook onClose={onClose} />;
  }

  return null;
}

const SUITE_BY_ID = Object.fromEntries(SUITE.map((s) => [s.id, s]));

/* ---------------------------------------------------------------------------
 * Phone-native hook screens — rendered inside the phone frame, over the tab
 * bar, so the user sees the Wallet sheet / Wi‑Fi join / loyalty check-in as a
 * deeper screen of the same app. These are simulated: the demo is honest that
 * nothing is signed, issued, or charged unless the owning integration is wired.
 * --------------------------------------------------------------------------- */

function WalletHook({ onClose }) {
  const [saved, setSaved] = useState(false);
  const memberNumber = "HL-00417";

  const prog = {
    name: "Harbor Lane Rewards",
    primaryColor: "#155eef",
    backgroundColor: "#12151a",
    labelColor: "#ffffff",
    barcodeFormat: "QR",
  };

  const handleSave = () => {
    setSaved(true);
  };

  return (
    <div className="mx-auto max-w-sm text-left">
      {/* sheet header */}
      <div className="flex items-center justify-between border-b border-white/10 py-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-tap">Harbor Lane Rewards</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-white/60 hover:text-white"
          aria-label="Close wallet sheet"
        >
          <X size={16} />
        </button>
      </div>

      {/* pass preview */}
      <div className="mt-4 border border-white/10 rounded-2xl bg-[#151d26] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] text-tap/80">Apple Wallet pass</p>
            <p className="mt-1 font-display text-[16px] font-semibold text-white">{prog.name}</p>
            <p className="mt-1 text-[12px] text-white/60">Member {memberNumber}</p>
          </div>
          <div
            className="shrink-0 rounded-xl p-2 text-tap"
            style={{
              backgroundColor: prog.primaryColor,
            }}
          >
            <CreditCard size={22} strokeWidth={1.8} />
          </div>
        </div>

        {/* simulated pass with a real QR showing the membership deep link */}
        <div className="mt-4 border border-white/10 rounded-2xl bg-white/5 p-4">
          <div className="flex flex-col items-center gap-3">
            <QrCodeSvg
              value={`omnitaps://membership/${memberNumber}`}
              size={140}
              level="M"
              frameLabel="Scan to identify"
              frameCaption={`Member ${memberNumber}`}
              frameLabelClassName="text-[10px] font-medium tracking-wide"
              frameCaptionClassName="text-[11px]"
              className=""
            />
          </div>
        </div>

        {/* simulated pass field strip */}
        <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] text-white/50">
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-[10px] text-tap/70">Barcode</p>
            <p className="mt-1 text-white/70">{prog.barcodeFormat} · QR</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-[10px] text-tap/70">Card color</p>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="shrink-0 inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: prog.primaryColor }}
              />
              <span className="text-white/70">{prog.primaryColor}</span>
            </div>
          </div>
        </div>
      </div>

      {/* honesty pill — depends on signing keys */}
      <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] text-amber-300">
        <div className="flex items-start gap-2">
          <ShieldCheck size={13} className="shrink-0 mt-0.5" strokeWidth={2} />
          <div>
            <p className="font-medium">Simulated pass — not signed unless signing keys are configured.</p>
            <p className="mt-1 text-amber-200/80">
              In a live tenant this sheet is gated by real Apple Wallet pass signing. This demo reflects the design and copy only.
            </p>
          </div>
        </div>
      </div>

      {/* Add to Apple Wallet button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saved}
        className={`mt-4 w-full rounded-xl border px-4 py-3 text-[13px] font-semibold shadow-inner transition-colors ${
          saved
            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
            : "border-tap/40 bg-tap text-white hover:opacity-90"
        } disabled:opacity-80`}
      >
        {saved ? "Added to Apple Wallet" : "Add to Apple Wallet"}
      </button>
      {saved ? (
        <p className="mt-2 text-[11px] text-emerald-300/80">
          Preview pass saved to the simulated wallet. In a real tenant this adds the signed pass.
        </p>
      ) : null}

      {/* close hint */}
      <button
        type="button"
        onClick={onClose}
        className="mt-4 flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-[11px] text-white/50 hover:text-white/80"
      >
        <ChevronRight size={13} className="rotate-180" /> Done
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Wi‑Fi hook: captive-style join screen for the guest network — QR + password
 * + OTP identity echo in this simulated demo. Modeled on the real WifiAccess
 * surfaces in the suite.
 * --------------------------------------------------------------------------- */

function WifiHook({ onClose }) {
  const [copied, setCopied] = useState(false);
  const [otp, setOtp] = useState("");
  const [joined, setJoined] = useState(false);

  const network = {
    name: "Harbor Lane Guest",
    password: "harbor-lane-2024",
    splashHeadline: "Welcome to Harbor Lane",
    splashBody: "Connect to the guest network and enjoy free Wi‑Fi during your visit.",
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(network.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!otp.trim()) return;
    setJoined(true);
  };

  return (
    <div className="mx-auto max-w-sm text-left">
      {/* captive header */}
      <div className="flex items-center justify-between border-b border-white/10 py-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-tap">Wi‑Fi · {network.name}</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-white/60 hover:text-white"
          aria-label="Close Wi‑Fi join"
        >
          <X size={16} />
        </button>
      </div>

      {/* QR join — primary guest path */}
      <div className="mt-4 rounded-2xl border border-white/10 bg-[#151d26] p-4">
        <p className="text-[11px] text-tap font-medium">Scan to join — easiest for guests</p>
        <div className="mt-2 border border-white/10 rounded-2xl bg-white/5 p-3">
          <QrCodeSvg
            value={`WIFI:T:WPA;S:${network.name};P:${network.password};;`}
            size={150}
            level="H"
            frameLabel="Scan with the camera"
            frameCaption="tap to connect"
            className=""
          />
        </div>
        <p className="mt-3 text-[11px] text-white/50">
          Point the camera at the QR, then tap the join banner that appears.
        </p>
      </div>

      {/* password copy — secondary path */}
      <div className="mt-3 rounded-2xl border border-white/10 bg-[#151d26] p-4">
        <p className="text-[11px] text-white/60">Network name</p>
        <p className="mt-0.5 font-medium">{network.name}</p>

        <label className="mt-3 flex flex-col gap-2">
          <span className="text-[10px] text-tap/80">Password</span>
          <div className="flex gap-2">
            <input
              readOnly
              type="text"
              value={network.password}
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-white select-text"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white hover:text-tap"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </label>
      </div>

      {/* captive splash — identity gate, simulated */}
      <div className="mt-4 border-t border-white/10 pt-4">
        <p className="text-[12px] font-medium text-white/80">{network.splashHeadline}</p>
        <p className="mt-1 text-[12px] text-white/50">{network.splashBody}</p>

        {/* simulated OTP — in dev this echoes; real identity is wired through real captive auth */}
        <form onSubmit={handleJoin} className="mt-4 flex flex-col gap-3">
          <p className="text-[11px] text-white/50">
            Optional identity — in this demo the one-time code echoes back. A real captive portal verifies the code with the network.
          </p>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] text-tap/80">One-time code</span>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.toUpperCase())}
              placeholder="e.g. 742198"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-tap"
            />
          </label>
          <button
            type="submit"
            disabled={!otp.trim() || joined}
            className="rounded-lg bg-tap px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
          >
            {joined ? "Connected" : "Join network"}
          </button>
        </form>

        {joined ? (
          <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-[11px] text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={13} className="shrink-0" />
              <div>
                <p className="font-medium">Joined {network.name}</p>
                <p className="text-emerald-200/80">
                  Simulated connection in this demo. A real tenant verifies identity and issues access through the network.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* honesty pill */}
      <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] text-amber-300">
        <div className="flex items-start gap-2">
          <ShieldCheck size={13} className="shrink-0 mt-0.5" strokeWidth={2} />
          <div>
            <p className="font-medium">Simulated join — no real captive portal is wired here.</p>
            <p className="mt-1 text-amber-200/80">
              The QR encodes the network as a Wi‑Fi payload; the password copy works. The one-time code echoes back; real identity verification and any paid upgrades need the real Wi‑Fi module and Stripe wired.
            </p>
          </div>
        </div>
      </div>

      {/* close hint */}
      <button
        type="button"
        onClick={onClose}
        className="mt-4 flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-[11px] text-white/50 hover:text-white/80"
      >
        <ChevronRight size={13} className="rotate-180" /> Done
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Loyalty hook: simulated loyalty -> wallet -> counter check-in loop. Earn a
 * visit, tap to add it, see the Wallet pass the counter would scan, then
 * simulate the counter recognizing the member at the register.
 * --------------------------------------------------------------------------- */

function LoyaltyHook({ onClose }) {
  const [memberNumber] = useState("HL-00417");
  const [visits, setVisits] = useState(11);
  const [points, setPoints] = useState(340);
  const [tier] = useState("Gold");
  const [pendingVisit, setPendingVisit] = useState(false);
  const [counterState, setCounterState] = useState("idle");
  const [checkInDone, setCheckInDone] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);

  const nextTier = tier === "Gold" ? "Platinum" : "Gold";
  const tierProgress = tier === "Gold" ? 0.68 : 1;

  const addVisit = () => {
    setVisits((v) => v + 1);
    setPoints((p) => p + 25);
    setPendingVisit(true);
  };

  const markVisitConfirmed = () => {
    setPendingVisit(false);
  };

  const openWallet = () => {
    setWalletOpen(true);
  };

  const closeWallet = () => {
    setWalletOpen(false);
  };

  const scanAtCounter = () => {
    if (counterState === "idle") {
      setCounterState("scanning");
    } else if (counterState === "scanning") {
      setCounterState("recognized");
    } else if (counterState === "recognized") {
      setCounterState("checkingIn");
    } else if (counterState === "checkingIn") {
      setCheckInDone(true);
    }
  };

  if (walletOpen) {
    return (
      <div className="mx-auto max-w-sm text-left">
        {/* wallet overlay header */}
        <div className="flex items-center justify-between border-b border-white/10 py-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-tap">Wallet pass</p>
          <button
            type="button"
            onClick={closeWallet}
            className="rounded-full p-1 text-white/60 hover:text-white"
            aria-label="Close Wallet pass view"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 border border-white/10 rounded-2xl bg-[#151d26] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] text-tap/80">Harbor Lane Rewards · Wallet</p>
              <p className="mt-1 font-display text-[16px] font-semibold text-white">{memberNumber}</p>
              <p className="mt-1 text-[12px] text-white/60">{tier} member</p>
            </div>
            <div className="shrink-0 rounded-xl bg-tap/20 p-2 text-tap">
              <CreditCard size={20} strokeWidth={1.8} />
            </div>
          </div>

          <div className="mt-4 border border-white/10 rounded-2xl bg-white/5 p-4">
            <div className="flex flex-col items-center gap-3">
              <QrCodeSvg
                value={`omnitaps://membership/${memberNumber}`}
                size={120}
                level="M"
                frameLabel="Counter scans this"
                frameCaption={`Member ${memberNumber}`}
                className=""
              />
            </div>
          </div>

          <p className="mt-3 text-[11px] text-white/50">
            This is the same membership QR the counter scans at check-in. In a live tenant the counter reads it and looks up the member.
          </p>
        </div>

        <button
          type="button"
          onClick={closeWallet}
          className="mt-4 w-full rounded-lg border border-white/10 px-4 py-2.5 text-[12px] font-medium text-white/70 hover:text-white"
        >
          Back to check-in loop
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm text-left">
      {/* hook header */}
      <div className="flex items-center justify-between border-b border-white/10 py-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-tap">Loyalty · counter check-in</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-white/60 hover:text-white"
          aria-label="Close loyalty hook"
        >
          <X size={16} />
        </button>
      </div>

      {/* member card */}
      <div className="mt-4 rounded-2xl border border-white/10 bg-[#151d26] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] text-tap/80">Harbor Lane Rewards</p>
            <p className="mt-1 font-display text-[17px] font-semibold text-white">{memberNumber}</p>
            <p className="mt-1 text-[12px] text-white/60">{tier} member · {points} points</p>
          </div>
          <div className="shrink-0 rounded-xl bg-tap/20 p-2 text-tap">
            <Award size={20} strokeWidth={1.8} />
          </div>
        </div>

        {/* progress to next tier */}
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] text-white/50">
            <span>Next tier: {nextTier}</span>
            <span>{Math.round(tierProgress * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-tap"
              style={{
                width: `${Math.max(8, Math.min(100, tierProgress * 100 + 6))}%`,
              }}
            />
          </div>
        </div>

        {/* visits stat */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-[11px] text-white/60">
          <span>Visits this month</span>
          <span className="font-medium text-white/80">{visits}</span>
        </div>
      </div>

      {/* earn a visit */}
      <div className="mt-3 flex flex-col gap-3 border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={addVisit}
          disabled={pendingVisit}
          className={`rounded-xl bg-tap px-4 py-2.5 text-[12px] font-semibold text-white disabled:opacity-50 shadow-inner`}
        >
          {pendingVisit ? "Visit added…" : "Add a visit (earn 25 pts)"}
        </button>
        {pendingVisit ? (
          <button
            type="button"
            onClick={markVisitConfirmed}
            className="rounded-lg border border-white/10 px-3 py-2 text-[11px] text-white/60 hover:text-white/80"
          >
            Confirm visit added
          </button>
        ) : null}
        {!pendingVisit ? (
          <p className="text-[11px] text-emerald-300/80">
            Simulated visit recorded. In a live tenant this comes from the counter check-in.
          </p>
        ) : null}
      </div>

      {/* wallet link CTA */}
      <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-4">
        <p className="text-[11px] text-white/50">The Wallet pass is how the counter recognizes you.</p>
        <button
          type="button"
          onClick={openWallet}
          className="rounded-lg border border-tap/30 bg-tap/10 px-3 py-2 text-[12px] font-medium text-tap hover:bg-tap hover:text-white"
        >
          View digital card in Wallet
        </button>
        <p className="text-[10px] text-white/40">
          Opens a simulated Wallet pass with the membership QR.
        </p>
      </div>

      {/* counter check-in loop */}
      <div className="mt-3 border-t border-white/10 pt-4">
        <p className="text-[12px] font-medium text-white/80">Check in at the counter</p>
        <p className="mt-1 text-[11px] text-white/50">
          Scan the member QR at the register. Here the loop is simulated step by step so you can see loyalty, Wallet, and the counter together.
        </p>

        {/* counter state */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-[#151d26] p-4">
          <p className="text-[10px] text-tap/80">Counter register</p>
          <p className="mt-1 font-mono text-[13px] text-white/70">
            {counterState === "idle"
              ? "Ready — tap to scan"
              : counterState === "scanning"
              ? "Scanning…"
              : counterState === "recognized"
              ? `Recognized ${memberNumber}`
              : "Checking in…"}
          </p>

          <div className="mt-3 flex items-center gap-2">
            <div className={`rounded-xl border px-3 py-2 text-[11px] ${
              counterState === "idle"
                ? "border-white/10 bg-white/5 text-white/50"
                : counterState === "scanning"
                ? "border-tap/40 bg-tap/10 text-tap"
                : "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
            }`}>
              {counterState === "idle" ? "—" : counterState === "scanning" ? "⌕" : `✔ ${memberNumber}`}
            </div>
            <button
              type="button"
              onClick={scanAtCounter}
              disabled={counterState === "checkingIn"}
              className={`rounded-lg px-3 py-2 text-[12px] font-medium shadow-inner transition-colors ${
                counterState === "idle"
                  ? "border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70"
                  : counterState === "scanning"
                  ? "border border-tap/40 bg-tap/10 text-tap"
                  : "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
              } disabled:opacity-50`}
            >
              {counterState === "idle"
                ? "Scan QR"
                : counterState === "scanning"
                ? "Recognize"
                : counterState === "recognized"
                ? "Check in"
                : "Done"}
            </button>
          </div>
        </div>
      </div>

      {checkInDone ? (
        <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-[11px] text-emerald-300">
          <p className="font-medium">Check-in complete</p>
          <p className="mt-1 text-emerald-200/80">
            Simulated loyalty → Wallet → counter loop finished. In a live tenant this updates the visit count and the Wallet pass reflects the new status.
          </p>
        </div>
      ) : null}

      {/* honesty pill — the loop is simulated */}
      <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] text-amber-300">
        <div className="flex items-start gap-2">
          <ShieldCheck size={13} className="shrink-0 mt-0.5" strokeWidth={2} />
          <div>
            <p className="font-medium">Simulated loop — not a real counter or real Wallet pass.</p>
            <p className="mt-1 text-amber-200/80">
              The earn, Wallet QR, and counter recognition are wired together as a demo flow. A real tenant connects loyalty, the actual Wallet pass, and the real point of sale.
            </p>
          </div>
        </div>
      </div>

      {/* close hint */}
      <button
        type="button"
        onClick={onClose}
        className="mt-4 flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-[11px] text-white/50 hover:text-white/80"
      >
        <ChevronRight size={13} className="rotate-180" /> Done
      </button>
    </div>
  );
}
