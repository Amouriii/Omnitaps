import { useState } from "react";
import { ArrowRight, Check, ChevronRight, Gift, History, LockKeyhole, Plus, QrCode, Sparkles, Star, Ticket, Trophy, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

const PROGRAMS = {
  cafe: {
    key: "cafe",
    label: "Café rewards",
    brand: "Harbor Lane Café",
    title: "Harbor Lane Rewards",
    description: "Turn regular visits into something worth coming back for.",
    pointsName: "beans",
    points: 2840,
    nextTier: 3000,
    tier: "Gold",
    accent: "#c45c26",
    soft: "#f3ddd0",
    background: "#21130d",
    icon: Gift,
    rewards: [
      { name: "Free pastry", detail: "Any pastry from the counter", cost: 1200, icon: Gift },
      { name: "$5 off", detail: "Your next visit", cost: 2000, icon: Ticket },
      { name: "Secret menu", detail: "Unlock a seasonal drink", cost: 3000, icon: Sparkles },
    ],
  },
  gym: {
    key: "gym",
    label: "Fitness club",
    brand: "Northline Athletics",
    title: "Northline Momentum",
    description: "Reward consistency, progress, and the next workout.",
    pointsName: "points",
    points: 1680,
    nextTier: 2000,
    tier: "Committed",
    accent: "#155eef",
    soft: "#eaf0fe",
    background: "#07152f",
    icon: Trophy,
    rewards: [
      { name: "Guest pass", detail: "Bring a friend for one workout", cost: 700, icon: Ticket },
      { name: "Recovery session", detail: "15 minutes with the mobility team", cost: 1400, icon: Sparkles },
      { name: "Free month", detail: "A month on us", cost: 2500, icon: Gift },
    ],
  },
  club: {
    key: "club",
    label: "Sports club",
    brand: "Harbor City Club",
    title: "Harbor City Club",
    description: "Make every match, booking, and visit count.",
    pointsName: "credits",
    points: 4120,
    nextTier: 5000,
    tier: "Founding",
    accent: "#8f6726",
    soft: "#f6eede",
    background: "#211b0e",
    icon: Star,
    rewards: [
      { name: "Guest court hour", detail: "Invite a non-member", cost: 1800, icon: Ticket },
      { name: "Club dinner", detail: "Two seats at the next social", cost: 3200, icon: Gift },
      { name: "Priority booking", detail: "Early access to finals week", cost: 4500, icon: Trophy },
    ],
  },
};

const ACTIVITY = [
  { label: "Morning visit", meta: "Today · 08:42", points: 120, icon: Plus },
  { label: "Avocado Toast", meta: "Yesterday · Harbor Lane Café", points: 240, icon: Gift },
  { label: "Welcome bonus", meta: "Jun 12 · New member", points: 500, icon: Sparkles },
];

function progress(points, nextTier) {
  return Math.min(100, Math.round((points / nextTier) * 100));
}

function RewardCard({ reward, canRedeem, onRedeem, accent }) {
  const Icon = reward.icon;
  return (
    <article className="flex flex-col rounded-2xl border border-hairline bg-surface p-4 transition-transform hover:-translate-y-1 hover:shadow-[0_18px_36px_-28px_rgba(18,21,26,0.55)]">
      <div className="flex items-start justify-between gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tap-soft" style={{ color: accent }}><Icon size={18} aria-hidden="true" /></div><span className="rounded-full bg-porcelain px-2.5 py-1 font-mono text-[10px] font-medium text-ink-muted">{reward.cost.toLocaleString()} pts</span></div>
      <h3 className="mt-5 text-[15px] font-semibold">{reward.name}</h3>
      <p className="mt-1 min-h-[40px] text-[13px] leading-[1.55] text-ink-muted">{reward.detail}</p>
      <button type="button" disabled={!canRedeem} onClick={() => onRedeem(reward)} className={`mt-4 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-semibold transition-colors ${canRedeem ? "text-white hover:opacity-90" : "cursor-not-allowed bg-porcelain text-ink-faint"}`} style={canRedeem ? { background: accent } : undefined}>{canRedeem ? "Redeem reward" : "Keep earning"}<ChevronRight size={14} /></button>
    </article>
  );
}

export default function LoyaltyDemo() {
  const [programKey, setProgramKey] = useState("cafe");
  const [points, setPoints] = useState(PROGRAMS.cafe.points);
  const [notice, setNotice] = useState("");
  const [showCard, setShowCard] = useState(false);
  const program = PROGRAMS[programKey];
  const Icon = program.icon;
  const tierProgress = progress(points, program.nextTier);
  const pointsToTier = Math.max(0, program.nextTier - points);

  const selectProgram = (key) => {
    setProgramKey(key);
    setPoints(PROGRAMS[key].points);
    setNotice("");
    setShowCard(false);
  };

  const addVisit = () => {
    setPoints((current) => current + 120);
    setNotice(`Visit added — 120 ${program.pointsName} on the way to your next tier.`);
  };

  const redeem = (reward) => {
    if (points < reward.cost) return;
    setPoints((current) => current - reward.cost);
    setNotice(`${reward.name} unlocked. Show this screen at the counter to use it.`);
  };

  return (
    <div className="min-h-screen bg-porcelain font-body text-ink">
      <SiteHeader />
      <main id="main" tabIndex="-1">
        <section className="relative isolate overflow-hidden border-b border-hairline">
          <div className="aurora aurora--tap -left-28 -top-36 h-[28rem] w-[28rem] opacity-60" />
          <div className="aurora aurora--brass right-[-10rem] top-12 h-[30rem] w-[30rem] opacity-50" />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[0.86fr_1.14fr] lg:items-center lg:gap-20 lg:py-24">
            <div>
              <p className="hero-enter font-mono text-[11px] uppercase tracking-[0.2em] text-tap">Interactive loyalty demo</p>
              <h1 className="hero-enter mt-4 max-w-xl font-display text-[42px] font-semibold leading-[1.04] tracking-[-0.04em] sm:text-[58px]">Make every visit worth more.</h1>
              <p className="hero-enter mt-6 max-w-lg text-[17px] leading-[1.7] text-ink-muted">A modern loyalty program that feels personal to customers and measurable to operators — not another plastic card or forgotten app.</p>
              <div className="hero-enter mt-8 flex flex-wrap gap-3"><a href="#loyalty-builder" className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[14px] font-semibold">Explore the program <ArrowRight size={16} /></a><Link to="/demo/wallet" className="btn-ghost rounded-xl px-5 py-3 text-[14px] font-semibold">See it in Wallet</Link></div>
              <div className="mt-9 flex flex-wrap gap-3 text-[12px] text-ink-faint"><span className="inline-flex items-center gap-2"><Check size={14} className="text-tap" /> Earn automatically</span><span className="inline-flex items-center gap-2"><Check size={14} className="text-tap" /> Redeem anywhere</span><span className="inline-flex items-center gap-2"><Check size={14} className="text-tap" /> Live customer data</span></div>
            </div>

            <div className="relative mx-auto w-full max-w-[440px]">
              <div className="absolute -inset-8 rounded-[40px] opacity-30 blur-3xl" style={{ background: program.accent }} />
              <div className="relative overflow-hidden rounded-[30px] p-6 text-white shadow-[0_35px_75px_-30px_rgba(18,21,26,0.7)] sm:p-8" style={{ background: `linear-gradient(145deg, ${program.background}, #12151a)` }}>
                <div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">{program.brand}</p><h2 className="mt-2 font-display text-[25px] font-semibold">{program.title}</h2></div><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10" style={{ color: program.accent }}><Icon size={21} /></div></div>
                <div className="mt-12 flex items-end justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">Your balance</p><p className="mt-2 font-display text-[48px] font-semibold leading-none tracking-[-0.05em]">{points.toLocaleString()}</p><p className="mt-2 text-[12px] text-white/55">{program.pointsName} · {program.tier} tier</p></div><div className="rounded-2xl px-3 py-2 text-right" style={{ background: `${program.accent}33` }}><p className="text-[10px] uppercase tracking-[0.12em] text-white/50">Next tier</p><p className="mt-1 font-semibold">{pointsToTier === 0 ? "Unlocked" : `${pointsToTier} to go`}</p></div></div>
                <div className="mt-8"><div className="mb-2 flex justify-between text-[11px] text-white/50"><span>{program.tier}</span><span>{program.nextTier.toLocaleString()} {program.pointsName}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${tierProgress}%`, background: program.accent }} /></div></div>
                <div className="mt-8 grid grid-cols-2 gap-3 border-t border-white/15 pt-5"><div><p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/45">This month</p><p className="mt-1 text-[14px] font-medium">8 visits</p></div><div><p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/45">Member since</p><p className="mt-1 text-[14px] font-medium">June 2024</p></div></div>
                <button type="button" onClick={() => setShowCard((current) => !current)} className="mt-6 inline-flex items-center gap-2 text-[12px] font-semibold text-white/70 hover:text-white"><WalletCards size={15} /> {showCard ? "Hide digital card" : "View digital card"}</button>
                {showCard ? <div className="mt-4 rounded-2xl border border-white/15 bg-white/10 p-4"><div className="flex items-center justify-between gap-3"><span className="text-[13px] font-medium">{program.title}</span><QrCode size={18} style={{ color: program.accent }} /></div><div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-white/55"><span>MAYA · HL-00428</span><span>Scan to earn</span></div></div> : null}
              </div>
            </div>
          </div>
        </section>

        <section id="loyalty-builder" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16 sm:px-8 sm:py-24">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
            <div className="lg:sticky lg:top-24"><p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brass-dark">Build your experience</p><h2 className="mt-3 font-display text-[30px] font-semibold tracking-[-0.03em] sm:text-[38px]">One program. Every reason to return.</h2><p className="mt-4 text-[15px] leading-[1.7] text-ink-muted">Choose a business model, add a visit, and redeem a reward. This is a safe simulation of the member experience — no account or payment required.</p>{notice ? <div className="mt-6 rounded-2xl border border-tap/10 bg-tap-soft p-4 text-[13px] leading-[1.6] text-tap" role="status"><Check size={15} className="mr-1 inline" />{notice}</div> : null}</div>
            <div className="rounded-3xl border border-hairline bg-surface p-5 shadow-[0_28px_60px_-42px_rgba(18,21,26,0.38)] sm:p-7">
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Loyalty program type">{Object.entries(PROGRAMS).map(([key, item]) => { const ProgramIcon = item.icon; const active = key === programKey; return <button key={key} type="button" role="tab" aria-selected={active} onClick={() => selectProgram(key)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold ${active ? "bg-ink text-white" : "border border-hairline bg-porcelain text-ink-muted hover:border-hairline-strong"}`}><ProgramIcon size={15} />{item.label}</button>; })}</div>
              <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-5"><div><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">Available rewards</p><p className="mt-1 text-[15px] font-semibold">Redeem your {program.pointsName}</p></div><button type="button" onClick={addVisit} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white" style={{ background: program.accent }}><Plus size={15} /> Add a visit</button></div>
              <div className="mt-5 grid gap-4 md:grid-cols-3">{program.rewards.map((reward) => <RewardCard key={reward.name} reward={reward} canRedeem={points >= reward.cost} onRedeem={redeem} accent={program.accent} />)}</div>
              <div className="mt-7 grid gap-4 border-t border-hairline pt-6 md:grid-cols-[1.1fr_0.9fr]"><div><div className="flex items-center gap-2"><History size={16} className="text-tap" /><h3 className="text-[14px] font-semibold">Recent activity</h3></div><div className="mt-3 divide-y divide-hairline">{ACTIVITY.map((item) => { const ActivityIcon = item.icon; return <div key={item.label} className="flex items-center justify-between gap-3 py-3"><div className="flex min-w-0 items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-porcelain text-ink-muted"><ActivityIcon size={14} /></span><div className="min-w-0"><p className="truncate text-[13px] font-medium">{item.label}</p><p className="text-[11px] text-ink-faint">{item.meta}</p></div></div><span className="shrink-0 font-mono text-[11px] font-medium text-tap">+{item.points}</span></div>; })}</div></div><div className="rounded-2xl border border-hairline bg-porcelain p-4"><div className="flex items-center gap-2 text-ink"><LockKeyhole size={15} className="text-tap" /><h3 className="text-[14px] font-semibold">Built for trust</h3></div><p className="mt-3 text-[13px] leading-[1.6] text-ink-muted">Every earn and redemption event is recorded, idempotent, and visible to the operator. No points disappear into a black box.</p><Link to="/contact" className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-tap hover:text-ink">Build this program <ArrowRight size={13} /></Link></div></div>
            </div>
          </div>
        </section>

        <section className="border-y border-hairline bg-surface"><div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 sm:px-8 md:grid-cols-3 md:py-20"><div><p className="font-mono text-[11px] uppercase tracking-[0.18em] text-tap">01 · Earn</p><h2 className="mt-3 font-display text-[21px] font-semibold">Reward the behavior you want more of.</h2><p className="mt-3 text-[14px] leading-[1.7] text-ink-muted">Visits, spend, referrals, reviews, and event attendance can all contribute to a shared balance.</p></div><div><p className="font-mono text-[11px] uppercase tracking-[0.18em] text-tap">02 · Personalize</p><h2 className="mt-3 font-display text-[21px] font-semibold">Make the next reward feel close.</h2><p className="mt-3 text-[14px] leading-[1.7] text-ink-muted">Tiers, progress, bonuses, and Wallet updates give customers a clear reason to return.</p></div><div><p className="font-mono text-[11px] uppercase tracking-[0.18em] text-tap">03 · Measure</p><h2 className="mt-3 font-display text-[21px] font-semibold">See what actually brings people back.</h2><p className="mt-3 text-[14px] leading-[1.7] text-ink-muted">Track earn rate, redemption, active members, and campaign lift from one operator view.</p></div></div></section>

        <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24"><div className="relative overflow-hidden rounded-3xl bg-ink px-7 py-14 text-center sm:px-14"><div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-tap opacity-25 blur-3xl" /><div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-brass opacity-20 blur-3xl" /><div className="relative"><p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/50">The loyalty loop</p><h2 className="mx-auto mt-3 max-w-2xl font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-white sm:text-[40px]">Give people a reason to come back tomorrow.</h2><p className="mx-auto mt-4 max-w-lg text-[15px] leading-[1.7] text-white/60">Start with a program that is simple for members and powerful for your team.</p><Link to="/contact" className="btn-primary mt-8 inline-flex rounded-xl px-6 py-3.5 text-[14px] font-semibold">Launch my loyalty program <ArrowRight size={16} className="ml-2" /></Link></div></div></section>
      </main>
      <SiteFooter />
    </div>
  );
}
