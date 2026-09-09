import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, ChevronDown, ChevronLeft, Copy, Dumbbell, Ellipsis, Gift, Info, QrCode, ShieldCheck, Trophy, WalletCards, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Link } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

const PROGRAMS = {
  rewards: {
    label: "Rewards",
    eyebrow: "Harbor Lane Café",
    title: "Harbor Lane Rewards",
    description: "Turn every visit into a reason to come back.",
    member: "Maya Thompson",
    number: "HL-00428",
    tier: "Gold member",
    points: "2,840 pts",
    accent: "#c45c26",
    background: "#21130d",
    soft: "#f3ddd0",
    icon: Gift,
  },
  gym: {
    label: "Gym",
    eyebrow: "Northline Athletics",
    title: "Northline Access",
    description: "A membership card your front desk can trust.",
    member: "Maya Thompson",
    number: "NL-00428",
    tier: "All-access",
    points: "Valid today",
    accent: "#155eef",
    background: "#07152f",
    soft: "#eaf0fe",
    icon: Dumbbell,
  },
  sports_club: {
    label: "Sports club",
    eyebrow: "Harbor City Club",
    title: "Harbor City Club",
    description: "Make club entry feel as premium as membership.",
    member: "Maya Thompson",
    number: "HC-00428",
    tier: "Founding member",
    points: "Season 2026",
    accent: "#8f6726",
    background: "#211b0e",
    soft: "#f6eede",
    icon: Trophy,
  },
};

const BARCODE_TYPES = ["QR", "PDF417", "CODE128"];

function Barcode({ value, type }) {
  if (type === "QR") {
    return (
      <div className="rounded-xl bg-white p-2 shadow-[0_10px_24px_-16px_rgba(0,0,0,0.8)]">
        <QRCodeSVG value={value} size={132} level="M" bgColor="#ffffff" fgColor="#12151a" title="Interactive membership QR code" />
      </div>
    );
  }

  const bars = Array.from({ length: type === "PDF417" ? 48 : 42 }, (_, index) => {
    const width = ((index * 7) % 4) + 1;
    return <span key={index} style={{ display: "block", width: `${width}px`, background: "#12151a" }} />;
  });

  return (
    <div className="rounded-xl bg-white px-3 py-5 shadow-[0_10px_24px_-16px_rgba(0,0,0,0.8)]">
      <div className="flex h-[92px] items-stretch justify-center gap-[2px] overflow-hidden bg-white">{bars}</div>
      <p className="mt-2 text-center font-mono text-[9px] tracking-[0.18em] text-ink">{value}</p>
    </div>
  );
}

function WalletPass({ program, barcodeType, showBack, onFlip }) {
  const Icon = program.icon;
  const barcodeValue = `omnitaps://membership/${program.number}`;

  return (
    <div className="relative mx-auto w-full max-w-[380px] [perspective:1200px]">
      <div className={`relative min-h-[520px] transition-transform duration-700 [transform-style:preserve-3d] ${showBack ? "[transform:rotateY(180deg)]" : ""}`}>
        <article
          className="absolute inset-0 overflow-hidden rounded-[30px] p-6 text-white shadow-[0_35px_75px_-30px_rgba(18,21,26,0.65)] [backface-visibility:hidden] sm:p-7"
          style={{ background: `linear-gradient(145deg, ${program.background}, #12151a)` }}
          aria-label={`${program.title} membership pass preview`}
        >
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full opacity-30 blur-3xl" style={{ background: program.accent }} />
          <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full opacity-20 blur-3xl" style={{ background: program.accent }} />
          <div className="relative flex min-h-[468px] flex-col">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">{program.eyebrow}</p>
                <h2 className="mt-2 font-display text-[22px] font-semibold tracking-[-0.02em]">{program.title}</h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10" style={{ color: program.accent }}>
                <Icon size={21} aria-hidden="true" />
              </div>
            </div>

            <div className="mt-12">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">Member</p>
              <p className="mt-2 font-display text-[30px] font-semibold tracking-[-0.03em]">{program.member}</p>
              <p className="mt-2 font-mono text-[12px] tracking-[0.12em] text-white/60">{program.number}</p>
              <div className="mt-7"><Barcode value={barcodeValue} type={barcodeType} /></div>
            </div>

            <div className="mt-auto grid grid-cols-2 gap-4 border-t border-white/15 pt-5">
              <div><p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/45">Status</p><p className="mt-1 text-[14px] font-medium">Active</p></div>
              <div><p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/45">{program.label === "Rewards" ? "Balance" : "Access"}</p><p className="mt-1 text-[14px] font-medium">{program.points}</p></div>
            </div>
            <div className="mt-6 flex items-end justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] text-white/55"><ShieldCheck size={14} style={{ color: program.accent }} /> Verified membership</div>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">2026</span>
            </div>
          </div>
        </article>

        <article
          className="absolute inset-0 min-h-[520px] overflow-hidden rounded-[30px] p-6 text-white shadow-[0_35px_75px_-30px_rgba(18,21,26,0.65)] [backface-visibility:hidden] [transform:rotateY(180deg)] sm:p-7"
          style={{ background: `linear-gradient(145deg, ${program.background}, #12151a)` }}
          aria-label={`${program.title} pass details`}
        >
          <div className="flex items-start justify-between gap-4 border-b border-white/15 pb-5"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">Pass details</p><h2 className="mt-2 font-display text-[22px] font-semibold">{program.title}</h2></div><WalletCards size={22} style={{ color: program.accent }} /></div>
          <div className="mt-7 space-y-5 text-[13px] leading-[1.6] text-white/70"><p><strong className="font-medium text-white">Member</strong><br />{program.member} · {program.number}</p><p><strong className="font-medium text-white">Terms</strong><br />Present this card at the venue. Membership status is checked at scan time.</p><p><strong className="font-medium text-white">Support</strong><br />support@{program.title.toLowerCase().replaceAll(" ", "")}.com</p></div>
          <p className="mt-auto border-t border-white/15 pt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">Powered by Omnitaps</p>
        </article>
      </div>
      <button type="button" onClick={onFlip} className="absolute -bottom-5 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-hairline bg-surface px-4 py-2 text-[12px] font-semibold text-ink shadow-[0_12px_24px_-16px_rgba(18,21,26,0.45)] hover:border-tap" aria-label={showBack ? "Show front of pass" : "Show back of pass"}>
        {showBack ? "Show front" : "View pass details"} <ChevronDown size={14} className={showBack ? "rotate-180" : ""} />
      </button>
    </div>
  );
}

function AppleWalletSheet({ program, barcodeType, onClose }) {
  const Icon = program.icon;
  const [showInfo, setShowInfo] = useState(false);
  const [scanReady, setScanReady] = useState(false);
  const barcodeValue = `omnitaps://membership/${program.number}`;

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090b0f]/75 p-3 backdrop-blur-sm sm:p-8" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="relative flex max-h-[min(900px,calc(100vh-24px))] w-full max-w-[430px] flex-col overflow-hidden rounded-[34px] border border-white/20 bg-[#f2f2f7] shadow-[0_40px_100px_-30px_rgba(0,0,0,0.75)]" role="dialog" aria-modal="true" aria-labelledby="wallet-sheet-title">
        <div className="shrink-0 bg-[#f2f2f7] px-5 pb-3 pt-3 text-[#17181c]">
          <div className="flex items-center justify-between font-mono text-[11px] font-medium tracking-[0.06em]"><span>9:41</span><span className="flex items-center gap-1.5" aria-hidden="true"><span className="h-2 w-3 rounded-[2px] border border-[#17181c]" /><span className="h-2 w-2 rounded-full bg-[#17181c]" /><span className="h-2 w-3 rounded-[2px] bg-[#17181c]" /></span></div>
          <div className="mt-4 flex items-center justify-between"><button type="button" onClick={onClose} className="inline-flex items-center gap-1 rounded-lg px-1 py-1 text-[14px] font-medium text-[#3478f6] hover:bg-black/5"><ChevronLeft size={17} /> Wallet</button><h2 id="wallet-sheet-title" className="text-[16px] font-semibold">Pass</h2><button type="button" onClick={() => setShowInfo((current) => !current)} className="rounded-full p-1.5 text-[#3478f6] hover:bg-black/5" aria-label="Pass options"><Ellipsis size={19} /></button></div>
        </div>

        <div className="min-h-0 overflow-y-auto px-4 pb-5 pt-3 sm:px-6">
          <div className="mb-3 flex items-center justify-center gap-2 text-[12px] font-medium text-[#6d6e73]"><span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#34c759] text-white"><Check size={13} strokeWidth={3} /></span> Added to Apple Wallet</div>
          <article className="overflow-hidden rounded-[22px] bg-white shadow-[0_18px_32px_-20px_rgba(0,0,0,0.55)]" aria-label={`${program.title} in Apple Wallet`}>
            <div className="relative overflow-hidden px-5 pb-5 pt-5 text-white" style={{ background: `linear-gradient(145deg, ${program.background}, #12151a)` }}>
              <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full opacity-40 blur-3xl" style={{ background: program.accent }} />
              <div className="relative flex items-start justify-between gap-4"><div><p className="text-[12px] font-medium text-white/65">{program.eyebrow}</p><p className="mt-1 text-[20px] font-semibold tracking-[-0.02em]">{program.title}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10" style={{ color: program.accent }}><Icon size={19} aria-hidden="true" /></div></div>
              <div className="relative mt-8"><p className="text-[11px] uppercase tracking-[0.15em] text-white/55">Member</p><p className="mt-1 text-[27px] font-semibold tracking-[-0.03em]">{program.member}</p><p className="mt-1 font-mono text-[12px] tracking-[0.12em] text-white/60">{program.number}</p></div>
            </div>
            <div className="px-5 pb-5 pt-5"><div className="flex justify-center rounded-2xl border border-[#e5e5e7] bg-white p-4"><Barcode value={barcodeValue} type={barcodeType} /></div><div className="mt-4 grid grid-cols-2 gap-4 border-t border-[#e5e5e7] pt-4"><div><p className="text-[10px] uppercase tracking-[0.12em] text-[#8b8c91]">Status</p><p className="mt-1 text-[14px] font-semibold text-[#17181c]">Active</p></div><div><p className="text-[10px] uppercase tracking-[0.12em] text-[#8b8c91]">{program.label === "Rewards" ? "Balance" : "Access"}</p><p className="mt-1 text-[14px] font-semibold text-[#17181c]">{program.points}</p></div></div></div>
          </article>

          <button type="button" onClick={() => setScanReady((current) => !current)} className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold transition-colors ${scanReady ? "bg-[#34c759] text-white" : "bg-[#3478f6] text-white hover:bg-[#2468e6]"}`}><QrCode size={17} />{scanReady ? "Ready for the scanner" : "Tap to show code"}</button>
          {scanReady ? <p className="mt-2 text-center text-[12px] text-[#6d6e73]" role="status">Keep the QR code facing the reader. Your membership is checked at scan time.</p> : null}
          {showInfo ? <div className="mt-4 rounded-2xl border border-[#dedee2] bg-white p-4 text-[13px] leading-[1.55] text-[#6d6e73]"><p className="flex items-center gap-2 font-semibold text-[#17181c]"><Info size={15} className="text-[#3478f6]" /> Pass information</p><p className="mt-3">Issued by {program.eyebrow}. This pass updates when your membership status changes.</p><p className="mt-2 font-mono text-[11px] text-[#8b8c91]">{program.number} · {barcodeType}</p></div> : null}
          <p className="mt-5 text-center text-[11px] leading-[1.45] text-[#8b8c91]">Demo Wallet view · This is a realistic simulation for the website preview.</p>
        </div>
        <button type="button" onClick={onClose} className="shrink-0 border-t border-[#dedee2] bg-[#f2f2f7] px-5 py-3.5 text-[14px] font-semibold text-[#3478f6] hover:bg-white">Done</button>
        <button type="button" onClick={onClose} className="absolute right-4 top-[58px] rounded-full bg-black/5 p-1 text-[#6d6e73] hover:bg-black/10" aria-label="Close Wallet preview"><X size={15} /></button>
      </div>
    </div>
  );
}

export default function WalletDemo() {
  const [programKey, setProgramKey] = useState("rewards");
  const [barcodeType, setBarcodeType] = useState("QR");
  const [memberName, setMemberName] = useState(PROGRAMS.rewards.member);
  const [memberNumber, setMemberNumber] = useState(PROGRAMS.rewards.number);
  const [showBack, setShowBack] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const program = PROGRAMS[programKey];
  const personalizedProgram = useMemo(() => ({ ...program, member: memberName || "Your member name", number: memberNumber || "YOUR-ID" }), [memberName, memberNumber, program]);

  const selectProgram = (key) => {
    setProgramKey(key);
    setMemberName(PROGRAMS[key].member);
    setMemberNumber(PROGRAMS[key].number);
    setShowBack(false);
    setSaved(false);
    setWalletOpen(false);
  };

  const openWallet = () => {
    setSaved(true);
    setShowBack(false);
    setWalletOpen(true);
  };

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(personalizedProgram.number);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="min-h-screen bg-porcelain text-ink font-body">
      <SiteHeader />
      <main id="main" tabIndex="-1">
        <section className="relative isolate overflow-hidden border-b border-hairline">
          <div className="aurora aurora--tap -left-24 -top-32 h-[26rem] w-[26rem] opacity-70" />
          <div className="aurora aurora--brass right-[-10rem] top-20 h-[28rem] w-[28rem] opacity-60" />
          <div className="dot-grid pointer-events-none absolute inset-0 -z-10 opacity-40" />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20 lg:py-24">
            <div>
              <p className="hero-enter font-mono text-[11px] uppercase tracking-[0.2em] text-tap" style={{ "--enter-delay": "80ms" }}>Interactive module demo</p>
              <h1 className="hero-enter mt-4 max-w-xl font-display text-[42px] font-semibold leading-[1.04] tracking-[-0.04em] sm:text-[58px]" style={{ "--enter-delay": "150ms" }}>Membership, reduced to one tap.</h1>
              <p className="hero-enter mt-6 max-w-lg text-[17px] leading-[1.7] text-ink-muted" style={{ "--enter-delay": "240ms" }}>Design a digital membership card for your rewards program, gym, or sports club — then let customers keep it where they already look.</p>
              <div className="hero-enter mt-8 flex flex-wrap gap-3" style={{ "--enter-delay": "320ms" }}><a href="#builder" className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[14px] font-semibold">Build a card <ArrowRight size={16} /></a><Link to="/contact" className="btn-ghost rounded-xl px-5 py-3 text-[14px] font-semibold">Talk to our team</Link></div>
              <div className="hero-enter mt-10 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-ink-faint" style={{ "--enter-delay": "420ms" }}><span className="inline-flex items-center gap-2"><Check size={14} className="text-tap" /> QR & barcodes</span><span className="inline-flex items-center gap-2"><Check size={14} className="text-tap" /> Live status control</span><span className="inline-flex items-center gap-2"><Check size={14} className="text-tap" /> Branded to you</span></div>
            </div>
            <div className="hero-enter--zoom" style={{ "--enter-delay": "180ms" }}><WalletPass program={personalizedProgram} barcodeType={barcodeType} showBack={showBack} onFlip={() => setShowBack((current) => !current)} /></div>
          </div>
        </section>

        <section id="builder" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16 sm:px-8 sm:py-24">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
            <div className="lg:sticky lg:top-24"><p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brass-dark">Make it yours</p><h2 className="mt-3 font-display text-[30px] font-semibold tracking-[-0.03em] sm:text-[38px]">Choose a business. Tune the card.</h2><p className="mt-4 text-[15px] leading-[1.7] text-ink-muted">This is a live preview of the customer experience. Change the inputs and watch the pass update instantly.</p><div className="mt-7 rounded-2xl border border-tap/10 bg-tap-soft p-4 text-[13px] leading-[1.6] text-ink-muted"><strong className="font-semibold text-tap">Wallet preview.</strong> Add the card to a simulated Apple Wallet so you can experience the QR code exactly where a member would use it.</div></div>
            <div className="rounded-3xl border border-hairline bg-surface p-5 shadow-[0_28px_60px_-42px_rgba(18,21,26,0.38)] sm:p-7">
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Business type"><span className="sr-only">Choose a business type</span>{Object.entries(PROGRAMS).map(([key, item]) => { const Icon = item.icon; const active = programKey === key; return <button key={key} type="button" role="tab" aria-selected={active} onClick={() => selectProgram(key)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-colors ${active ? "bg-ink text-white" : "border border-hairline bg-porcelain text-ink-muted hover:border-hairline-strong hover:text-ink"}`}><Icon size={15} />{item.label}</button>; })}</div>
              <div className="mt-7 grid gap-5 sm:grid-cols-2"><label><span className="mb-2 block text-[12px] font-medium text-ink-muted">Member name</span><input value={memberName} onChange={(event) => setMemberName(event.target.value)} className="w-full rounded-xl border border-hairline bg-porcelain px-3 py-3 text-[14px] outline-none focus:border-tap" /></label><label><span className="mb-2 block text-[12px] font-medium text-ink-muted">Member number</span><div className="flex gap-2"><input value={memberNumber} onChange={(event) => setMemberNumber(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-hairline bg-porcelain px-3 py-3 font-mono text-[13px] outline-none focus:border-tap" /><button type="button" onClick={() => void copyNumber()} className="rounded-xl border border-hairline px-3 text-ink-muted hover:border-tap hover:text-tap" aria-label="Copy member number">{copied ? <Check size={16} /> : <Copy size={16} />}</button></div></label></div>
              <div className="mt-6"><span className="mb-2 block text-[12px] font-medium text-ink-muted">Scan format</span><div className="flex flex-wrap gap-2">{BARCODE_TYPES.map((type) => <button key={type} type="button" onClick={() => setBarcodeType(type)} className={`rounded-lg px-3 py-2 font-mono text-[11px] font-medium ${barcodeType === type ? "bg-tap-soft text-tap" : "border border-hairline text-ink-muted hover:border-hairline-strong"}`}>{type}</button>)}</div></div>
              <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-hairline pt-6"><button type="button" onClick={openWallet} className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[14px] font-semibold"><WalletCards size={16} /> {saved ? "Open Apple Wallet" : "Add to Apple Wallet"}</button><button type="button" onClick={() => setShowBack((current) => !current)} className="rounded-xl border border-hairline px-5 py-3 text-[14px] font-semibold text-ink hover:border-tap">{showBack ? "Show front" : "View details"}</button>{saved ? <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-tap" role="status"><Check size={15} /> Saved to demo Wallet</span> : null}</div>
            </div>
          </div>
        </section>

        <section className="border-y border-hairline bg-surface"><div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 sm:px-8 md:grid-cols-3 md:py-20"><div><p className="font-mono text-[11px] uppercase tracking-[0.18em] text-tap">01 · Issue</p><h2 className="mt-3 font-display text-[21px] font-semibold">Create once, distribute anywhere.</h2><p className="mt-3 text-[14px] leading-[1.7] text-ink-muted">Your team creates a member and sends a secure Wallet link by email, SMS, or at the counter.</p></div><div><p className="font-mono text-[11px] uppercase tracking-[0.18em] text-tap">02 · Scan</p><h2 className="mt-3 font-display text-[21px] font-semibold">Fast at the door.</h2><p className="mt-3 text-[14px] leading-[1.7] text-ink-muted">QR, PDF417, Code 128, or Aztec gives staff a familiar way to check the member in.</p></div><div><p className="font-mono text-[11px] uppercase tracking-[0.18em] text-tap">03 · Control</p><h2 className="mt-3 font-display text-[21px] font-semibold">Status stays yours.</h2><p className="mt-3 text-[14px] leading-[1.7] text-ink-muted">Pause or revoke memberships from the operator console without changing the customer experience.</p></div></div></section>

        <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24"><div className="relative overflow-hidden rounded-3xl bg-ink px-7 py-14 text-center sm:px-14"><div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-tap opacity-25 blur-3xl" /><div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-brass opacity-20 blur-3xl" /><div className="relative"><p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/50">Ready when you are</p><h2 className="mx-auto mt-3 max-w-2xl font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-white sm:text-[40px]">Give your next member a better kind of card.</h2><p className="mx-auto mt-4 max-w-lg text-[15px] leading-[1.7] text-white/60">Start with Wallet, then connect it to the rest of your customer experience.</p><Link to="/contact" className="btn-primary mt-8 inline-flex rounded-xl px-6 py-3.5 text-[14px] font-semibold">Build this for my business <ArrowRight size={16} className="ml-2" /></Link></div></div></section>
      </main>
      <SiteFooter />
      {walletOpen ? <AppleWalletSheet program={personalizedProgram} barcodeType={barcodeType} onClose={() => setWalletOpen(false)} /> : null}
    </div>
  );
}
