import { MapPin, Bike } from "lucide-react";

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}
import { useScrollReveal } from "../../lib/kk-hooks/use-scroll-reveal";

const BRANCHES = [
  { area: "Sheikh Zayed", name: "Arkan Plaza" },
  { area: "North Koast", name: "Sahel's Telal" },
];

export function Locations() {
  const revealRef = useScrollReveal<HTMLElement>();

  return (
    <section
      id="locations"
      ref={revealRef}
      className="mx-auto max-w-6xl px-5 py-16 md:py-24"
    >
      <span data-reveal className="label-mono text-accent">
        05 — Find Us
      </span>
      <h2
        data-reveal
        className="mt-3 font-display text-4xl font-extrabold sm:text-5xl"
      >
        A multi-branch koffee habit
      </h2>
      <p data-reveal className="mt-4 max-w-2xl text-muted-foreground">
        Koffee Kulture runs across Kairo, Sheikh Zayed and the North Koast —
        including Golf Central Palm Hills, U-Venues Mall, Trivium, Marassi, Azza
        Fahmy Diplo and Almaza. Branches have changed over time, so check the
        app or our socials for the full current list.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {BRANCHES.map((b) => (
          <div
            key={b.name}
            data-reveal
            className="kk-card rounded-2xl border border-border bg-card p-6"
          >
            <MapPin className="h-5 w-5 text-accent" />
            <p className="label-mono mt-3 text-muted-foreground">{b.area}</p>
            <p className="font-display text-xl font-bold">{b.name}</p>
          </div>
        ))}
        <div
          data-reveal
          className="kk-card rounded-2xl border border-border bg-primary p-6 text-primary-foreground"
        >
          <Bike className="h-5 w-5" />
          <p className="label-mono mt-3 opacity-80">Already on</p>
          <p className="font-display text-xl font-bold">Talabat delivery</p>
          <p className="mt-2 text-sm opacity-90">
            Ordering here goes direct to the branch — no marketplace in between.
          </p>
        </div>
        <div
          data-reveal
          className="kk-card rounded-2xl border border-border bg-card p-6"
        >
          <InstagramIcon className="h-5 w-5 text-accent" />
          <p className="label-mono mt-3 text-muted-foreground">Socials</p>
          <p className="font-display text-xl font-bold">@koffeekulture</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Full branch list, new drops and opening hours.
          </p>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="terrazzo border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <p className="font-display text-3xl font-extrabold leading-tight sm:text-4xl">
          Different People, with Different Kultures, holding Different Koffee
          Kups.
        </p>
        <p className="label-mono mt-4 text-muted-foreground">
          Specialty Koffee and Breakfast Kulture
        </p>
        <div className="mt-8 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
          <p>
            Menu items and prices are sourced from a public menu listing and may
            be out of date — confirm current pricing with the owner before
            launch. Tax shown is a sample 14% rate.
          </p>
          <p className="mt-3">
            © {new Date().getFullYear()} Koffee Kulture. Founded by Amina Akef.
          </p>
        </div>
      </div>
    </footer>
  );
}
