import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import LogoMark from "./LogoMark";
import ThemeToggle from "./ThemeToggle";

/**
 * @param {object} props
 * @param {string} [props.ctaHref]
 * @param {boolean} [props.showTryDemos=true] set false on operator pages, where
 *   ConsoleChrome's strip already links the same destinations.
 */
export default function SiteHeader({ ctaHref = null, showTryDemos = true }) {
    // §12 Materials: the hairline + shadow only appear once content actually
    // scrolls underneath the floating chrome — an edge effect, not a divider.
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <header className={`site-chrome--top site-header sticky top-0 z-40 border-b border-hairline bg-porcelain/85 backdrop-blur ${scrolled ? "is-scrolled" : ""}`}>
            <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2.5 shrink-0" aria-label="Omnitaps home">
                    <LogoMark className="w-7 h-7" />
                    <span className="font-display font-semibold text-[19px] tracking-tight text-ink">
                        Omnitaps
                    </span>
                </Link>

                <nav aria-label="Primary" className="flex items-center gap-3 sm:gap-6">
                    {showTryDemos && (
                        <Link to="/demo" className="nav-link hidden text-[15px] sm:inline">
                            Try demos
                        </Link>
                    )}
                    <ThemeToggle />
                    {ctaHref ? (
                        <a
                            href={ctaHref}
                            className="btn-primary rounded-lg px-4.5 py-2.5 text-[14px] font-semibold"
                        >
                            Book a Demo
                        </a>
                    ) : (
                        <Link
                            to="/contact"
                            className="btn-primary rounded-lg px-4.5 py-2.5 text-[14px] font-semibold"
                        >
                            Book a Demo
                        </Link>
                    )}
                </nav>
            </div>
        </header>
    );
}
