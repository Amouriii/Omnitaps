import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import LogoMark from "./LogoMark";
import ThemeToggle from "./ThemeToggle";

const NAV_LINKS = [
    { label: "Solutions", to: "/#solutions" },
    { label: "How it works", to: "/#how-it-works" },
    { label: "Contact", to: "/contact" },
];

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
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        if (!menuOpen) return undefined;
        const onKey = (e) => {
            if (e.key === "Escape") setMenuOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [menuOpen]);

    const closeMenu = () => setMenuOpen(false);

    const ctaClass = "btn-primary rounded-lg px-4.5 py-2.5 text-[14px] font-semibold";

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
                    {NAV_LINKS.map((link) => (
                        <Link key={link.label} to={link.to} className="nav-link hidden text-[15px] md:inline">
                            {link.label}
                        </Link>
                    ))}
                    {showTryDemos && (
                        <Link to="/demo" className="nav-link hidden text-[15px] sm:inline">
                            Try demos
                        </Link>
                    )}
                    <ThemeToggle />
                    {ctaHref ? (
                        <a
                            href={ctaHref}
                            className={`${ctaClass} hidden md:inline-flex`}
                        >
                            Book a Demo
                        </a>
                    ) : (
                        <Link
                            to="/contact"
                            className={`${ctaClass} hidden md:inline-flex`}
                        >
                            Book a Demo
                        </Link>
                    )}

                    <button
                        type="button"
                        className="md:hidden p-2 -mr-2 text-ink"
                        aria-label={menuOpen ? "Close menu" : "Open menu"}
                        aria-expanded={menuOpen}
                        aria-controls="site-mobile-menu"
                        onClick={() => setMenuOpen((v) => !v)}
                    >
                        {menuOpen ? (
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
                        ) : (
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
                        )}
                    </button>
                </nav>
            </div>

            {menuOpen && (
                <div id="site-mobile-menu" className="md:hidden border-t border-hairline bg-porcelain px-5 pb-6 pt-2">
                    <nav aria-label="Mobile" className="flex flex-col gap-1">
                        {NAV_LINKS.map((link) => (
                            <Link
                                key={link.label}
                                to={link.to}
                                onClick={closeMenu}
                                className="py-2.5 text-[15px] text-ink-muted"
                            >
                                {link.label}
                            </Link>
                        ))}
                        {showTryDemos && (
                            <Link to="/demo" onClick={closeMenu} className="py-2.5 text-[15px] text-ink-muted">
                                Try demos
                            </Link>
                        )}
                        {ctaHref ? (
                            <a
                                href={ctaHref}
                                onClick={closeMenu}
                                className="btn-primary mt-3 block text-center rounded-lg px-5 py-3 text-[14px] font-semibold"
                            >
                                Book a Demo
                            </a>
                        ) : (
                            <Link
                                to="/contact"
                                onClick={closeMenu}
                                className="btn-primary mt-3 block text-center rounded-lg px-5 py-3 text-[14px] font-semibold"
                            >
                                Book a Demo
                            </Link>
                        )}
                    </nav>
                </div>
            )}
        </header>
    );
}