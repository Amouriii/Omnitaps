import { useParams, useNavigate } from "react-router-dom";
import { items } from "../data/items";

export default function ItemDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const item = items.find((i) => i.id === id);

    if (!item) {
        return (
            <main id="main" className="min-h-screen flex flex-col items-center justify-center bg-porcelain text-ink" role="main" tabIndex="-1">
                <h1 className="text-2xl font-bold mb-4">Module Not Found</h1>
                <button onClick={() => navigate("/")} className="btn-primary px-6 py-2 rounded-lg">
                    Back to Overview
                </button>
            </main>
        );
    }

    return (
        <main id="main" className="min-h-screen bg-porcelain text-ink font-body p-8" role="main" tabIndex="-1">
            <div className="max-w-3xl mx-auto bg-surface rounded-2xl shadow-sm border border-hairline p-8 md:p-12">
                <button
                    onClick={() => navigate("/")}
                    className="mb-8 text-sm font-semibold text-ink-muted hover:text-ink transition-colors inline-flex items-center gap-2"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Back to Overview
                </button>

                <div className="font-mono text-[12px] tracking-widest uppercase text-tap mb-4">
                    Omnitaps Module Details
                </div>
                <h1 className="font-display text-[32px] md:text-[40px] font-semibold mb-6">
                    {item.title}
                </h1>
                <p className="text-[18px] leading-relaxed text-ink-muted mb-8">
                    {item.desc}
                </p>

                <div className="bg-tap-soft rounded-xl p-6 text-tap border border-tap/10">
                    <h3 className="font-semibold mb-2">Integration Readiness</h3>
                    <p className="text-sm opacity-80">
                        This module connects seamlessly with your existing Omnitaps dashboard and customer records.
                    </p>
                </div>
            </div>
        </main>
    );
}