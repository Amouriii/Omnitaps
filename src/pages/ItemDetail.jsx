import { Link, useParams, useNavigate } from "react-router-dom";
import { items } from "../data/items";

const MODULE_DEMOS = {
  website: {
    href: "/s/demo",
    label: "Open website demo",
    blurb: "See the Demo Café tenant website, including hours, menu, and the guest chatbot.",
  },
  "qr-menus": {
    href: "/menu/demo",
    label: "Open guest menu demo",
    blurb: "Browse the live QR menu experience for the demo café.",
  },
  "ai-chatbots": {
    href: "/s/demo",
    label: "Open site with chatbot",
    blurb: "The demo website includes the guest chatbot widget on published pages.",
  },
  reviews: {
    href: "/r/demo/review",
    label: "Open review funnel demo",
    blurb: "Walk the guest review capture flow end to end.",
  },
  wifi: {
    href: "/r/demo/wifi",
    label: "Open Wi‑Fi QR demo",
    blurb: "Preview instant QR Wi‑Fi join for the demo tenant.",
  },
};

export default function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const item = items.find((i) => i.id === id);
  const demo = id ? MODULE_DEMOS[id] : null;

  if (!item) {
    return (
      <main
        id="main"
        className="min-h-screen flex flex-col items-center justify-center bg-porcelain text-ink"
        tabIndex="-1"
      >
        <h1 className="text-2xl font-bold mb-4">Module Not Found</h1>
        <button onClick={() => navigate("/")} className="btn-primary px-6 py-2 rounded-lg">
          Back to Overview
        </button>
      </main>
    );
  }

  return (
    <main id="main" className="min-h-screen bg-porcelain text-ink font-body p-8" tabIndex="-1">
      <div className="max-w-3xl mx-auto bg-surface rounded-2xl shadow-sm border border-hairline p-8 md:p-12">
        <button
          onClick={() => navigate("/")}
          className="mb-8 text-sm font-semibold text-ink-muted hover:text-ink transition-colors inline-flex items-center gap-2"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Overview
        </button>

        <div className="font-mono text-[12px] tracking-widest uppercase text-tap mb-4">
          Omnitaps Module Details
        </div>
        <h1 className="font-display text-[32px] md:text-[40px] font-semibold mb-6">{item.title}</h1>
        <p className="text-[18px] leading-relaxed text-ink-muted mb-8">{item.desc}</p>

        <div className="bg-tap-soft rounded-xl p-6 text-tap border border-tap/10">
          <h3 className="font-semibold mb-2">Integration Readiness</h3>
          <p className="text-sm opacity-80">
            This module connects seamlessly with your existing Omnitaps dashboard and customer
            records.
          </p>
        </div>

        {demo ? (
          <div className="mt-6 rounded-xl border border-hairline bg-porcelain p-6">
            <h3 className="font-semibold mb-2">Live demo</h3>
            <p className="text-sm text-ink-muted mb-4">{demo.blurb}</p>
            <Link to={demo.href} className="btn-primary inline-flex rounded-lg px-5 py-2.5 text-sm font-semibold">
              {demo.label}
            </Link>
          </div>
        ) : null}

        {id === "website" ? (
          <div className="mt-4 text-sm text-ink-muted">
            Operator dashboard demo:{" "}
            <Link to="/demo/dashboard" className="text-tap hover:underline">
              /demo/dashboard
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}
