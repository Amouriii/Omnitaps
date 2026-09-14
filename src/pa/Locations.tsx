import { MapPin, Bike, Phone, Clock } from "lucide-react";
import { useScrollReveal } from "../../lib/pa-hooks/use-scroll-reveal";
import { useNeonFlicker } from "../../lib/pa-motion";
import { LOCATION } from "./menu";

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}


export function Locations() {
  const revealRef = useScrollReveal<HTMLElement>();
  const headingRef = useNeonFlicker<HTMLHeadingElement>();

  return (
    <section
      id="find"
      ref={revealRef}
      className="relative bg-[#232323] px-5 py-20 md:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <div data-reveal>
          <span className="label-mono text-[#29D9FF]">05 · Find Us</span>
          <h2
            ref={headingRef}
            className="mt-4 font-display text-4xl leading-[1.02] text-white sm:text-5xl"
          >
            One address.{" "}
            <span className="text-[#29D9FF] [text-shadow:0_0_18px_#29D9FF88]">
              Under the neon.
            </span>
          </h2>
          <p className="mt-4 max-w-2xl text-white/70">
            {LOCATION.street}, {LOCATION.area}, {LOCATION.city}. Come hungry,
            leave happy. The neon outside does the advertising.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div
            data-reveal
            className="pa-card rounded-2xl border border-[#C4C8CC]/25 bg-white/[0.03] p-6 sm:col-span-2"
          >
            <MapPin className="h-5 w-5 text-[#F2597F]" />
            <p className="label-mono mt-3 text-white/50">The diner</p>
            <p className="mt-1 font-display text-xl leading-snug text-white">
              {LOCATION.name}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              {LOCATION.street}
              <br />
              {LOCATION.area}, {LOCATION.city}
            </p>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Pablo+%26+Abdo+96+Omar+Ibn+El-Khattab+Almazah+Heliopolis+Cairo"
              target="_blank"
              rel="noreferrer"
              className="pa-nav-link label-mono mt-4 inline-block text-[#29D9FF]"
            >
              Open in Maps →
            </a>
          </div>

          <div
            data-reveal
            className="pa-card rounded-2xl border border-[#C4C8CC]/25 bg-white/[0.03] p-6"
          >
            <Clock className="h-5 w-5 text-[#29D9FF]" />
            <p className="label-mono mt-3 text-white/50">Hours</p>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Late enough for a cheesesteak at midnight. Check our socials for
              today's hours.
            </p>
          </div>

          <div
            data-reveal
            className="pa-card rounded-2xl border border-[#C4C8CC]/25 bg-white/[0.03] p-6"
          >
            <InstagramIcon className="h-5 w-5 text-[#F2597F]" />
            <p className="label-mono mt-3 text-white/50">Socials</p>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Find Pablo & Abdo on Instagram for drops, hours, and the full
              menu.
            </p>
          </div>

          <div
            data-reveal
            className="rounded-2xl border-2 border-[#29D9FF]/50 bg-[#29D9FF]/10 p-6 sm:col-span-2"
          >
            <Bike className="h-5 w-5 text-[#29D9FF]" />
            <p className="label-mono mt-3 text-[#29D9FF]/80">Already on</p>
            <p className="font-display text-xl text-white">elmenus & Talabat</p>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Ordering here goes{" "}
              <span className="text-[#29D9FF]">direct to the diner</span>, no
              marketplace commission in between.
            </p>
          </div>

          <div
            data-reveal
            className="rounded-2xl border-2 border-[#F2597F]/50 bg-[#F2597F]/10 p-6 sm:col-span-2"
          >
            <Phone className="h-5 w-5 text-[#F2597F]" />
            <p className="label-mono mt-3 text-[#F2597F]/80">Big group?</p>
            <p className="font-display text-xl text-white">Call the counter</p>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Reservations above handle most tables. For big groups and events,
              phone us and we'll sort you out.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="pa-checkerboard-edge border-t-2 border-[#C4C8CC]/30 bg-[#1b1b1b]">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <p className="font-display text-3xl leading-tight text-white sm:text-4xl">
          <span translate="no" className="pa-signage text-2xl">
            PABLO & ABDO
          </span>
          <span className="mt-2 block text-xl text-white/80 sm:text-2xl">
            Fresh &{" "}
            <span translate="no" className="text-[#29D9FF]">
              طازة
            </span>
            . The American/Egyptian Diner experience.
          </span>
        </p>

        <div className="mt-8 border-t border-white/10 pt-6 text-xs leading-relaxed text-white/40">
          <p>
            Menu items are real dishes from public reviews; prices shown are
            samples in EGP, confirm current pricing with the owner before
            launch. Tax shown is a sample 14% rate. Card payments (when enabled)
            are processed in EGP by Paymob.
          </p>
          <p className="mt-3">
            © {new Date().getFullYear()} Pablo & Abdo, Heliopolis, Cairo. Brand
            identity by Mad Studio.
          </p>
        </div>
      </div>
    </footer>
  );
}
