import { Link } from "react-router-dom";
import LogoMark from "./LogoMark";

const PRODUCT_LINKS = [
    "Websites",
    "QR Menus",
    "AI Chatbots",
    "Reservations",
    "Review Management",
    "WiFi Access",
];

export default function SiteFooter() {
    return (
        <footer className="border-t border-hairline" aria-label="Footer">
            <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 grid sm:grid-cols-2 md:grid-cols-4 gap-10">
                <div>
                    <Link to="/" className="flex items-center gap-2.5 shrink-0" aria-label="Omnitaps home">
                        <LogoMark className="w-7 h-7" />
                        <span className="font-display font-semibold text-[19px] tracking-tight text-ink">
                            Omnitaps
                        </span>
                    </Link>
                    <p className="text-[14.5px] leading-[1.6] text-ink-muted mt-4 max-w-[200px]">
                        Digital infrastructure for hospitality &amp; retail.
                    </p>
                </div>

                <div>
                    <div className="font-mono text-[11px] uppercase tracking-widest text-ink-faint mb-4">
                        Product
                    </div>
                    <ul className="space-y-2.5 text-[14.5px]">
                        {PRODUCT_LINKS.map((t) => (
                            <li key={t}>
                                <Link to="/#solutions" className="nav-link">{t}</Link>
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <div className="font-mono text-[11px] uppercase tracking-widest text-ink-faint mb-4">
                        Company
                    </div>
                    <ul className="space-y-2.5 text-[14.5px]">
                        <li>
                            <Link to="/about" className="nav-link">About</Link>
                        </li>
                        <li>
                            <Link to="/careers" className="nav-link">Careers</Link>
                        </li>
                        <li>
                            <Link to="/contact" className="nav-link">Contact</Link>
                        </li>
                    </ul>
                </div>

                <div>
                    <div className="font-mono text-[11px] uppercase tracking-widest text-ink-faint mb-4">
                        Legal
                    </div>
                    <ul className="space-y-2.5 text-[14.5px]">
                        <li>
                            <Link to="/privacy-policy" className="nav-link">Privacy Policy</Link>
                        </li>
                        <li>
                            <Link to="/terms-of-service" className="nav-link">Terms of Service</Link>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-5 sm:px-8 py-6 border-t border-hairline flex flex-col sm:flex-row justify-between gap-2 text-[13px] text-ink-faint">
                <span>© {new Date().getFullYear()} Omnitaps, Inc. All rights reserved.</span>
                <span className="font-mono">Built for businesses that never close.</span>
            </div>
        </footer>
    );
}
