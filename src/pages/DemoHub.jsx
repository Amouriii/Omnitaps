import { Link } from "react-router-dom";
import { DEMO_LINKS } from "../components/demo/DemoChrome";

const CARDS = [
  {
    ...DEMO_LINKS[0],
    eyebrow: "QR menu",
    title: "Guest menu",
    body: "Drinks, plates, and sweets with categories, badges, and a sold-out item — the seeded Prisma café menu.",
  },
  {
    ...DEMO_LINKS[1],
    eyebrow: "Reviews",
    title: "Review funnel",
    body: "4–5 stars continue to Google. 1–3 stars open a private form for the café team.",
  },
  {
    ...DEMO_LINKS[2],
    eyebrow: "Wi‑Fi",
    title: "Guest Wi‑Fi",
    body: "Scan the QR on a phone, or copy the demo password on a laptop. Splash copy is seeded with the network.",
  },
  {
    ...DEMO_LINKS[3],
    eyebrow: "Website + chat",
    title: "Café website",
    body: "Hours, map, menu embed, and a chatbot that answers café questions from seeded knowledge.",
  },
];

export default function DemoHub() {
  return (
    <main className="min-h-screen bg-porcelain text-ink font-body">
      <div className="border-b border-hairline bg-porcelain/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-tap">Guest demos</p>
          <Link to="/" className="text-[14px] text-ink-muted hover:text-ink">
            Omnitaps
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-tap">Demo Café</p>
        <h1 className="mt-3 font-display text-[36px] font-semibold tracking-[-0.02em] sm:text-[44px]">
          Walk the guest experience
        </h1>
        <p className="mt-4 max-w-2xl text-[16px] leading-[1.7] text-ink-muted">
          These pages are the public Demo Café tenant (slug <span className="font-mono text-ink">demo</span>
          ). Re-seed locally with <span className="font-mono text-[13px] text-ink">npm run db:seed</span> to
          load the richer menu, Wi‑Fi splash, website blocks, and chatbot answers.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {CARDS.map((card) => (
            <Link
              key={card.to}
              to={card.to}
              className="group rounded-3xl border border-hairline bg-surface p-6 shadow-[0_28px_60px_-42px_rgba(18,21,26,0.38)] transition hover:border-hairline-strong sm:p-8"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-tap">{card.eyebrow}</p>
              <h2 className="mt-3 font-display text-[24px] font-semibold tracking-[-0.02em] group-hover:text-tap">
                {card.title}
              </h2>
              <p className="mt-3 text-[15px] leading-[1.7] text-ink-muted">{card.body}</p>
              <p className="mt-5 text-[13px] font-medium text-tap">Open {card.label} →</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
