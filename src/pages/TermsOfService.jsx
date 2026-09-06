import { Link } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

/* Draft terms — review with counsel before publishing. */
const SECTIONS = [
    {
        heading: "1. Acceptance of These Terms",
        body: "By accessing or using the Omnitaps platform, you agree to be bound by these Terms of Service. If you are using the platform on behalf of a business, you represent that you have authority to bind that business. If you do not agree, please do not use the services.",
    },
    {
        heading: "2. The Services",
        body: "Omnitaps provides digital infrastructure for hospitality and retail, including websites, QR menus, AI chatbots, reservations, review management, and WiFi access. We may add, change, or remove features over time, and will make reasonable efforts to notify you of material changes.",
    },
    {
        heading: "3. Accounts & Customer Content",
        body: "You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. You retain ownership of the content you upload, and you grant us the limited right to host, process, and display it solely to provide the services to you.",
    },
    {
        heading: "4. Acceptable Use",
        body: "You agree not to misuse the platform — including attempting to access it without authorization, interfering with its operation, scraping data at scale, or using it to violate any applicable law or the rights of others, such as sending unsolicited messages to guests.",
    },
    {
        heading: "5. Fees & Payment",
        body: "Fees for paid plans are described at the time of purchase. Unless otherwise stated, fees are non-refundable, and you agree to pay all charges associated with your account on time. We may change pricing with reasonable notice.",
    },
    {
        heading: "6. Intellectual Property",
        body: "The platform, including its software, design, and branding, is owned by Omnitaps and protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works of the platform except as expressly permitted.",
    },
    {
        heading: "7. Disclaimers & Limitation of Liability",
        body: "The services are provided 'as is' and 'as available' without warranties of any kind, express or implied. To the maximum extent permitted by law, Omnitaps is not liable for indirect, incidental, special, or consequential damages, or for any loss of data, revenue, or business opportunity arising from use of the services.",
    },
    {
        heading: "8. Termination",
        body: "You may stop using the services at any time and cancel your account. We may suspend or terminate access for violations of these terms or where required by law. Sections that by their nature should survive termination — including ownership, disclaimers, and limitation of liability — will continue to apply.",
    },
    {
        heading: "9. Changes to These Terms",
        body: "We may update these terms from time to time. When we do, we will revise the 'Last updated' date and notify you of material changes. Continued use of the platform after changes take effect constitutes acceptance of the updated terms.",
    },
];

export default function TermsOfService() {
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
                        Terms of Service
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
                                10. Contact Us
                            </h2>
                            <p className="text-[15px] leading-[1.7] text-ink-muted">
                                Questions about these terms? Reach us at{" "}
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
