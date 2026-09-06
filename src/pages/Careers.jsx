import { Link } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

const PERKS = [
    {
        title: "Work from anywhere",
        desc: "Remote-first and async-friendly, with annual in-person offsites. Your output matters, not your timezone.",
    },
    {
        title: "Real customers, real feedback",
        desc: "Every week, engineers talk to the cafés and hotels that run their business on Omnitaps.",
    },
    {
        title: "Ship and own it",
        desc: "Small teams and no hand-offs. You own your work from first sketch to launch.",
    },
    {
        title: "Craft by default",
        desc: "Clean interfaces, reliable systems, accessible to everyone. We ship things we are proud of.",
    },
];

/* Placeholder roles — replace with real openings when hiring. */
const ROLES = [
    {
        title: "Senior Full-Stack Engineer",
        location: "Remote · Americas/EMEA",
        desc: "Build the platform behind websites, menus, reservations, and WiFi — React, Node, and Postgres.",
    },
    {
        title: "Product Designer",
        location: "Remote · Americas",
        desc: "Design calm, clear tools for busy operators who have no time for complexity.",
    },
    {
        title: "Customer Success Lead",
        location: "Remote · Americas",
        desc: "Own the first cafés and hotels — onboarding, support, and the feedback loop back to product.",
    },
    {
        title: "Growth Marketer",
        location: "Remote · Americas",
        desc: "Tell the story of one-tap digital infrastructure to hospitality and retail teams.",
    },
];

export default function Careers() {
    return (
        <main id="main" className="min-h-screen bg-porcelain text-ink font-body" tabIndex="-1">
            <SiteHeader />

            {/* ---------------- HERO ---------------- */}
            <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-16 pb-12 md:pt-24 md:pb-16">
                <div className="max-w-2xl">
                    <div className="font-mono text-[12px] tracking-[0.14em] uppercase text-tap mb-5">
                        Careers
                    </div>
                    <h1 className="font-display font-semibold text-[36px] leading-[1.1] sm:text-[48px] md:text-[52px] tracking-[-0.02em] text-ink mb-6">
                        Build the platform that runs businesses that never close.
                    </h1>
                    <p className="text-[17px] leading-[1.6] text-ink-muted max-w-xl mb-9">
                        Omnitaps is a small, senior team building digital infrastructure for
                        hospitality and retail. We ship daily, talk to real customers weekly, and
                        believe great tools are quiet — they just work.
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                        <a
                            href="#open-roles"
                            className="btn-primary rounded-lg px-6 py-3.5 text-[15px] font-semibold inline-flex items-center gap-2"
                        >
                            View open roles
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                        </a>
                        <Link to="/contact" className="btn-ghost rounded-lg px-6 py-3.5 text-[15px] font-semibold">
                            Talk to us
                        </Link>
                    </div>
                </div>
            </section>

            {/* ---------------- PERKS ---------------- */}
            <section className="border-y border-hairline bg-surface">
                <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 md:py-20">
                    <div className="max-w-xl mb-12">
                        <div className="font-mono text-[12px] tracking-[0.14em] uppercase text-tap mb-3">
                            Why work here
                        </div>
                        <h2 className="font-display font-semibold text-[30px] md:text-[36px] tracking-[-0.01em] text-ink">
                            A small team doing serious work.
                        </h2>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        {PERKS.map((p) => (
                            <div key={p.title} className="rounded-2xl border border-hairline bg-porcelain p-7">
                                <h3 className="font-display font-semibold text-[17px] text-ink mb-2">
                                    {p.title}
                                </h3>
                                <p className="text-[14.5px] leading-[1.6] text-ink-muted">
                                    {p.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ---------------- ROLES ---------------- */}
            <section id="open-roles" className="max-w-6xl mx-auto px-5 sm:px-8 py-20 md:py-28 scroll-mt-20">
                <div className="max-w-xl mb-12">
                    <div className="font-mono text-[12px] tracking-[0.14em] uppercase text-brass-dark mb-3">
                        Open roles
                    </div>
                    <h2 className="font-display font-semibold text-[30px] md:text-[36px] tracking-[-0.01em] text-ink mb-4">
                        Work with us.
                    </h2>
                    <p className="text-[16px] leading-[1.6] text-ink-muted">
                        These are placeholders for now — apply through the contact page and we will
                        point you to the right person.
                    </p>
                </div>

                <ul className="divide-y divide-hairline border-y border-hairline">
                    {ROLES.map((r) => (
                        <li
                            key={r.title}
                            className="flex flex-col md:flex-row md:items-center justify-between gap-3 py-6"
                        >
                            <div>
                                <h3 className="font-display font-semibold text-[17px] text-ink mb-1">
                                    {r.title}
                                </h3>
                                <div className="font-mono text-[12px] uppercase tracking-widest text-ink-faint mb-2">
                                    {r.location}
                                </div>
                                <p className="text-[14.5px] leading-[1.6] text-ink-muted max-w-lg">
                                    {r.desc}
                                </p>
                            </div>
                            <Link
                                to="/contact"
                                className="btn-ghost shrink-0 rounded-lg px-5 py-2.5 text-[14px] font-semibold text-center"
                            >
                                Apply
                            </Link>
                        </li>
                    ))}
                </ul>

                <div className="mt-10 text-[15px] text-ink-muted">
                    Do not see your role?{" "}
                    <Link to="/contact" className="font-semibold text-tap hover:text-ink transition-colors">
                        Get in touch
                    </Link>{" "}
                    — we always want to meet great people.
                </div>
            </section>

            <SiteFooter />
        </main>
    );
}
