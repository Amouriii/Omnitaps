import { Link } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

/* Draft policy — review with counsel before publishing. */
const SECTIONS = [
    {
        heading: "1. Information We Collect",
        body: "We collect information you provide directly — such as your name, email address, and business details when you create an account, book a demo, or contact us. We also collect information automatically, including device and usage data, cookies, and log information, to keep the platform secure and improve our services.",
    },
    {
        heading: "2. How We Use Information",
        body: "We use the information we collect to provide and maintain our services, respond to your requests, send you updates and marketing where permitted, detect and prevent fraud or abuse, and improve and personalize the platform. Customer data is used to operate the features you ask for — such as WiFi guest capture, reservations, and review management — and never sold to third parties.",
    },
    {
        heading: "3. Sharing & Disclosure",
        body: "We share information only with service providers who help us operate the platform (such as hosting and payment providers), when required by law, or with your consent. These providers are bound by confidentiality obligations and may only use the data to perform services on our behalf.",
    },
    {
        heading: "4. Cookies & Tracking",
        body: "We use cookies and similar technologies to remember your preferences, understand how the platform is used, and keep you signed in. You can control cookies through your browser settings; disabling them may affect some features.",
    },
    {
        heading: "5. Data Retention & Security",
        body: "We retain information only as long as needed to provide the services, comply with legal obligations, and resolve disputes. We apply industry-standard technical and organizational measures — including encryption in transit and at rest, and access controls — to protect your data.",
    },
    {
        heading: "6. Your Rights & Choices",
        body: "Depending on where you live, you may have rights to access, correct, export, or delete your personal information, and to object to or restrict certain processing. You can exercise these rights by contacting us, and we will respond within the timeframe required by applicable law.",
    },
];

export default function PrivacyPolicy() {
    return (
        <main id="main" className="min-h-screen bg-porcelain text-ink font-body" tabIndex="-1">
            <SiteHeader />

            {/* ---------------- HERO ---------------- */}
            <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-16 pb-12 md:pt-24 md:pb-16">
                <div className="max-w-2xl">
                    <div className="font-mono text-[12px] tracking-[0.14em] uppercase text-tap mb-5">
                        Legal
                    </div>
                    <h1 className="font-display font-semibold text-[36px] leading-[1.1] sm:text-[48px] md:text-[52px] tracking-[-0.02em] text-ink mb-4">
                        Privacy Policy
                    </h1>
                    <p className="text-[15px] text-ink-muted">
                        Last updated: August 19, 2026 · Draft — review with counsel before publishing.
                    </p>
                </div>
            </section>

            {/* ---------------- CONTENT ---------------- */}
            <section className="border-t border-hairline bg-surface">
                <div className="max-w-3xl mx-auto px-5 sm:px-8 py-16 md:py-20">
                    <div className="space-y-10">
                        {SECTIONS.map((s) => (
                            <div key={s.heading}>
                                <h2 className="font-display font-semibold text-[20px] text-ink mb-3">
                                    {s.heading}
                                </h2>
                                <p className="text-[15px] leading-[1.7] text-ink-muted">
                                    {s.body}
                                </p>
                            </div>
                        ))}

                        <div>
                            <h2 className="font-display font-semibold text-[20px] text-ink mb-3">
                                7. Contact Us
                            </h2>
                            <p className="text-[15px] leading-[1.7] text-ink-muted">
                                Questions about this policy? Reach us at{" "}
                                <Link to="/contact" className="font-semibold text-tap hover:text-ink transition-colors">
                                    hello@omnitaps.com
                                </Link>{" "}
                                or through our{" "}
                                <Link to="/contact" className="font-semibold text-tap hover:text-ink transition-colors">
                                    contact page
                                </Link>
                                .
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <SiteFooter />
        </main>
    );
}
