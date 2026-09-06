import { useState } from "react";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { submitContactMessage } from "../lib/apiClient";

/* Dummy contact details — replace with real data when available. */
const CONTACT_CHANNELS = [
    { icon: Mail, label: "Email", value: "hello@omnitaps.com", hint: "General questions & partnerships" },
    { icon: Phone, label: "Phone", value: "+1 (555) 010-2030", hint: "Mon–Fri, 9:00–18:00 PT" },
    { icon: MapPin, label: "Office", value: "100 Market Street, Suite 400", hint: "San Francisco, CA 94105" },
    { icon: Clock, label: "Hours", value: "Mon–Fri · 9:00–18:00", hint: "Pacific Time" },
];

const inputClass =
    "w-full rounded-xl border border-hairline bg-porcelain px-4 py-3 text-[15px] text-ink placeholder:text-ink-faint focus:border-tap focus:outline-none";

export default function Contact() {
    const [status, setStatus] = useState("idle"); // idle | submitting | success | error
    const [error, setError] = useState("");

    async function onSubmit(e) {
        e.preventDefault();
        const form = e.currentTarget;
        const data = new FormData(form);
        setStatus("submitting");
        setError("");
        try {
            await submitContactMessage({
                name: data.get("name"),
                email: data.get("email"),
                company: data.get("company") ?? "",
                message: data.get("message"),
            });
            form.reset();
            setStatus("success");
        } catch (err) {
            setStatus("error");
            setError(
                err instanceof Error
                    ? err.message
                    : "Something went wrong. Please try again.",
            );
        }
    }

    return (
        <main id="main" className="min-h-screen bg-porcelain text-ink font-body" tabIndex="-1">
            <SiteHeader ctaHref="#contact-form" />

            {/* ---------------- HERO ---------------- */}
            <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-16 pb-12 md:pt-24 md:pb-16">
                <div className="max-w-2xl">
                    <div className="font-mono text-[12px] tracking-[0.14em] uppercase text-tap mb-5">
                        Contact
                    </div>
                    <h1 className="font-display font-semibold text-[36px] leading-[1.1] sm:text-[48px] md:text-[52px] tracking-[-0.02em] text-ink mb-6">
                        Talk to us.
                    </h1>
                    <p className="text-[17px] leading-[1.6] text-ink-muted max-w-xl">
                        Questions about the platform, a walkthrough for your team, or a partnership —
                        we would love to hear from you.
                    </p>
                </div>
            </section>

            {/* ---------------- CHANNELS ---------------- */}
            <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-16 md:pb-20">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {CONTACT_CHANNELS.map((c) => (
                        <div key={c.label} className="rounded-2xl border border-hairline bg-surface p-6">
                            <div className="w-10 h-10 rounded-xl bg-tap-soft text-tap flex items-center justify-center mb-4">
                                <c.icon className="w-5 h-5" />
                            </div>
                            <div className="font-mono text-[11px] uppercase tracking-widest text-ink-faint mb-1">
                                {c.label}
                            </div>
                            <div className="text-[15px] font-semibold text-ink">{c.value}</div>
                            <div className="mt-1 text-[13px] text-ink-muted">{c.hint}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ---------------- FORM ---------------- */}
            <section id="contact-form" className="border-t border-hairline bg-surface scroll-mt-20">
                <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 md:py-24 grid lg:grid-cols-2 gap-12">
                    <div>
                        <div className="font-mono text-[12px] tracking-[0.14em] uppercase text-brass-dark mb-3">
                            Send us a message
                        </div>
                        <h2 className="font-display font-semibold text-[30px] md:text-[36px] tracking-[-0.01em] text-ink mb-4">
                            We reply within one business day.
                        </h2>
                        <p className="text-[16px] leading-[1.6] text-ink-muted">
                            Tell us a little about your business and what you would like to try.
                            We read every message and reply within one business day.
                        </p>
                    </div>

                    <form onSubmit={onSubmit} className="space-y-5" aria-label="Contact form">
                        <div className="grid sm:grid-cols-2 gap-5">
                            <label className="block">
                                <span className="mb-2 block text-[13px] font-medium text-ink">Name</span>
                                <input required type="text" name="name" placeholder="Your name" className={inputClass} />
                            </label>
                            <label className="block">
                                <span className="mb-2 block text-[13px] font-medium text-ink">Email</span>
                                <input required type="email" name="email" placeholder="you@example.com" className={inputClass} />
                            </label>
                        </div>
                        <label className="block">
                            <span className="mb-2 block text-[13px] font-medium text-ink">Company / business</span>
                            <input type="text" name="company" placeholder="Café name, hotel group…" className={inputClass} />
                        </label>
                        <label className="block">
                            <span className="mb-2 block text-[13px] font-medium text-ink">Message</span>
                            <textarea required name="message" rows={5} placeholder="How can we help?" className={`${inputClass} resize-y`} />
                        </label>

                        {status === "success" ? (
                            <div
                                className="rounded-xl border border-tap/10 bg-tap-soft px-4 py-3 text-[14px] font-medium text-tap"
                                role="status"
                            >
                                Thanks — we have your message and will be in touch shortly.
                            </div>
                        ) : (
                            <>
                                {status === "error" ? (
                                    <div
                                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] font-medium text-red-700"
                                        role="alert"
                                    >
                                        {error}
                                    </div>
                                ) : null}
                                <button
                                    type="submit"
                                    disabled={status === "submitting"}
                                    className="btn-primary rounded-lg px-6 py-3.5 text-[15px] font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {status === "submitting" ? "Sending…" : "Send message"}
                                </button>
                            </>
                        )}
                    </form>
                </div>
            </section>

            <SiteFooter />
        </main>
    );
}
