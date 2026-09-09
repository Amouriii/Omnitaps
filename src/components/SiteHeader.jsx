import { Link } from "react-router-dom";
import LogoMark from "./LogoMark";

/**
 * @param {object} props
 * @param {string} [props.ctaHref]
 * @param {boolean} [props.showTryDemos=true] set false on operator pages, where
 *   ConsoleChrome's strip already links the same destinations.
 */
export default function SiteHeader({ ctaHref = null, showTryDemos = true }) {
    return (
        <header className="site-chrome--top sticky top-0 z-40 border-b border-hairline bg-porcelain/85 backdrop-blur">
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
