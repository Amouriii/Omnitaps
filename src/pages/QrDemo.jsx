import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import HeroMenuDemo from "../components/home/HeroMenuDemo";
import useScrollReveal from "../hooks/useScrollReveal";

/**
 * /demo/qr — the QR mini-demo on its own page instead of floating over the
 * café website's hero. Café-themed via CafeThemeGate (theme="cafe" makes the
 * demo re-skin automatically: cream surfaces, terracotta accents, Fraunces).
 */
export default function QrDemo() {
    const rootRef = useScrollReveal();

    return (
        <div ref={rootRef} className="min-h-screen w-full bg-porcelain text-ink font-body demo-cafe-route">
            <main
                id="main"
                tabIndex={-1}
                className="relative mx-auto flex min-h-[calc(100svh-3.5rem)] w-full max-w-2xl flex-col items-center justify-center px-5 py-14 text-center"
            >
                <Link
                    to="/s/demo"
                    className="hero-enter absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-3.5 py-1.5 font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted transition-colors hover:text-ink"
                >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    Café
                </Link>

                <p className="hero-enter inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.22em] uppercase text-ink-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-tap" aria-hidden="true" />
                    Table 4 · Harbor Lane
                </p>
                <h1 className="hero-enter mt-4 font-display text-4xl font-semibold tracking-[-0.03em] text-ink sm:text-5xl" style={{ "--enter-delay": "90ms" }}>
                    Today at Demo Café
                </h1>
                <p className="hero-enter mt-4 max-w-md text-[15px] leading-6 text-ink-muted" style={{ "--enter-delay": "180ms" }}>
                    This is what your guests see after scanning the QR sticker on
                    their table — the live menu, nothing else in the way.
                </p>

                <div className="hero-enter--zoom relative mt-10 flex w-full justify-center" style={{ "--enter-delay": "260ms" }}>
                    <HeroMenuDemo tenantId="demo" theme="cafe" />
                </div>

                <p className="reveal mt-10 max-w-md text-[13px] leading-5 text-ink-faint">
                    Part of the Omnitaps demo —{" "}
                    <Link to="/s/demo" className="underline decoration-hairline-strong underline-offset-2 hover:text-ink">
                        back to the café website
                    </Link>{" "}
                    or{" "}
                    <Link to="/menu/demo" className="underline decoration-hairline-strong underline-offset-2 hover:text-ink">
                        the full guest menu
                    </Link>
                    .
                </p>
            </main>
        </div>
    );
}
