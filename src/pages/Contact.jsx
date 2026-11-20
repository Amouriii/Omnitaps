import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, Mail, MapPin, Phone } from "lucide-react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { submitContactMessage } from "../lib/apiClient";
import {
  PRIMARY_CONTACT,
  TEAM,
  buildEnquiryMailto,
  formatPhone,
  mailtoHref,
  telHref,
} from "../data/contact";
import useScrollReveal from "../hooks/useScrollReveal";

const OFFICES = [
  {
    icon: MapPin,
    label: "Office",
    value: "100 Market Street, Suite 400",
    hint: "San Francisco, CA 94105",
    href: "https://maps.google.com/?q=100+Market+Street+Suite+400+San+Francisco+CA+94105",
    cta: "Get directions",
  },
  {
    icon: Clock,
    label: "Hours",
    value: "Mon–Fri · 9:00–18:00",
    hint: "Pacific Time",
    href: "#contact-form",
    cta: "Send a message",
  },
];

const inputClass =
  "w-full rounded-xl border border-hairline bg-porcelain px-4 py-3 text-[15px] text-ink placeholder:text-ink-faint focus:border-tap focus:outline-none";

function initials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function Contact() {
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [error, setError] = useState("");
  const [mailtoLink, setMailtoLink] = useState("");
  const rootRef = useScrollReveal();
  const child = (i) => ({ "--child-delay": `${i * 90}ms` });

  async function onSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const values = {
      name: data.get("name"),
      email: data.get("email"),
      company: data.get("company") ?? "",
      message: data.get("message"),
    };
    setStatus("submitting");
    setError("");
    setMailtoLink("");
    try {
      await submitContactMessage(values);
      form.reset();
      setStatus("success");
    } catch (err) {
      setStatus("error");
      // The server answered 503 because it has no delivery channel (no reachable
      // database and no Resend key). Hand the message to the visitor's mail app
      // so it still reaches the team instead of dead-ending in an error banner.
      if (err?.code === "CONTACT_DELIVERY_UNCONFIGURED") {
        setMailtoLink(buildEnquiryMailto(values));
        setError(
          `We could not send that from the site. Send it from your mail app, or email ${PRIMARY_CONTACT.email} directly.`,
        );
        return;
      }
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    }
  }

  return (
    <main id="main" ref={rootRef} className="min-h-screen bg-porcelain text-ink font-body" tabIndex="-1">
      <SiteHeader ctaHref="#contact-form" />

      {/* ---------------- HERO ---------------- */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-16 pb-12 md:pt-24 md:pb-16">
        <div className="max-w-2xl">
          <div className="reveal font-mono text-[12px] tracking-[0.14em] uppercase text-tap mb-5">
            Contact
          </div>
          <h1 className="reveal font-display font-semibold text-[36px] leading-[1.1] sm:text-[48px] md:text-[52px] tracking-[-0.02em] text-ink mb-6" style={{ "--reveal-delay": "90ms" }}>
            Talk to us.
          </h1>
          <p className="reveal text-[17px] leading-[1.6] text-ink-muted max-w-xl mb-8" style={{ "--reveal-delay": "180ms" }}>
            Questions about the platform, a walkthrough for your team, or a partnership — we would love to hear from you.
          </p>
          <div className="reveal flex flex-wrap gap-3" style={{ "--reveal-delay": "260ms" }}>
            <a
              href="#contact-form"
              className="btn-primary press-scale rounded-lg px-6 py-3.5 text-[15px] font-semibold inline-flex items-center gap-2"
            >
              Send a message
              <ArrowRight size={16} strokeWidth={2} />
            </a>
            <Link
              to="/demo"
              className="btn-ghost press-scale rounded-lg px-6 py-3.5 text-[15px] font-semibold"
            >
              Try the demos
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------- TEAM ---------------- */}
      <section aria-labelledby="team-heading" className="max-w-6xl mx-auto px-5 sm:px-8 pb-6">
        <h2 id="team-heading" className="reveal font-mono text-[12px] tracking-[0.14em] uppercase text-ink-faint mb-5">
          Reach a person
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          {TEAM.map((person, i) => (
            <article
              key={person.name}
              className="reveal-child flex flex-col rounded-2xl border border-hairline bg-surface p-6 hover:border-tap/40 transition-colors"
              style={child(i)}
            >
              <div className="flex items-center gap-3.5 mb-6">
                <span
                  aria-hidden="true"
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-tap-soft text-tap font-display font-semibold text-[15px]"
                >
                  {initials(person.name)}
                </span>
                <div className="min-w-0">
                  <h3 className="font-display font-semibold text-[16.5px] leading-tight text-ink">
                    {person.name}
                  </h3>
                  <p className="mt-0.5 text-[12.5px] text-ink-muted">{person.role}</p>
                </div>
              </div>

              <div className="mt-auto space-y-2.5">
                <a
                  href={mailtoHref(person.email)}
                  className="flex items-center gap-2.5 rounded-lg border border-hairline px-3.5 py-2.5 text-[13px] font-medium text-ink transition-colors hover:border-tap/50 hover:bg-tap-soft hover:text-tap"
                >
                  <Mail size={15} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-tap" />
                  <span className="break-all">{person.email}</span>
                </a>
                {person.phones.map((phone) => (
                  <a
                    key={phone}
                    href={telHref(phone)}
                    className="flex items-center gap-2.5 rounded-lg border border-hairline px-3.5 py-2.5 text-[13px] font-medium text-ink transition-colors hover:border-tap/50 hover:bg-tap-soft hover:text-tap"
                  >
                    <Phone size={15} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-tap" />
                    <span>{formatPhone(phone)}</span>
                  </a>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ---------------- OFFICE / HOURS ---------------- */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-6 pb-16 md:pb-20">
        <div className="grid gap-5 sm:grid-cols-2">
          {OFFICES.map((item, i) => (
            <div
              key={item.label}
              className="reveal-child flex flex-col rounded-2xl border border-hairline bg-surface p-6"
              style={child(i)}
            >
              <div className="w-10 h-10 rounded-xl bg-tap-soft text-tap flex items-center justify-center mb-4">
                <item.icon size={18} strokeWidth={1.8} aria-hidden="true" />
              </div>
              <div className="font-mono text-[11px] uppercase tracking-widest text-ink-faint mb-1">
                {item.label}
              </div>
              <div className="text-[15px] font-semibold text-ink">{item.value}</div>
              <div className="mt-1 mb-4 text-[13px] text-ink-muted">{item.hint}</div>
              <a
                href={item.href}
                {...(item.href.startsWith("http")
                  ? { target: "_blank", rel: "noreferrer noopener" }
                  : {})}
                className="mt-auto inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-tap hover:underline"
              >
                {item.cta}
                <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- FORM ---------------- */}
      <section id="contact-form" className="border-t border-hairline bg-surface scroll-mt-20">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 md:py-24 grid lg:grid-cols-2 gap-12">
          <div className="reveal">
            <div className="font-mono text-[12px] tracking-[0.14em] uppercase text-brass-dark mb-3">
              Send us a message
            </div>
            <h2 className="font-display font-semibold text-[30px] md:text-[36px] tracking-[-0.01em] text-ink mb-4">
              We reply within one business day.
            </h2>
            <p className="text-[16px] leading-[1.6] text-ink-muted mb-6">
              Tell us a little about your business and what you would like to try.
              We read every message and reply within one business day.
            </p>
            <p className="text-[14px] leading-[1.6] text-ink-muted">
              Prefer email?{" "}
              <a
                href={mailtoHref(PRIMARY_CONTACT.email)}
                className="font-semibold text-tap hover:underline"
              >
                {PRIMARY_CONTACT.email}
              </a>
            </p>
          </div>

          <form onSubmit={onSubmit} className="reveal-child space-y-5" aria-label="Contact form" style={{ "--child-delay": "150ms" }}>
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
                    <p>{error}</p>
                    {mailtoLink ? (
                      <a
                        href={mailtoLink}
                        className="mt-2 inline-block font-semibold underline underline-offset-2"
                      >
                        Open your mail app
                      </a>
                    ) : null}
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