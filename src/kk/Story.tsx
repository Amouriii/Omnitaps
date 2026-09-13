import { CupSoda, Sparkles, Croissant } from "lucide-react";
import { useScrollReveal } from "../../lib/kk-hooks/use-scroll-reveal";

const POINTS = [
  {
    icon: CupSoda,
    title: "The Koffee Kan",
    body: "Clear, can-shaped kups instead of standard koffee kups. It's the thing press keeps writing about, and the reason your feed looks better after brunch.",
  },
  {
    icon: Sparkles,
    title: "Editorial meets pop",
    body: "Sage, beige and terrazzo. Loud typography, quiet interiors. A space built to be photographed and re-photographed.",
  },
  {
    icon: Croissant,
    title: "Breakfast Kulture",
    body: "Kroissants, benedicts, bagels and salads all day — specialty koffee is only half of what we do.",
  },
];

export function Story() {
  const revealRef = useScrollReveal<HTMLElement>();

  return (
    <section
      id="story"
      ref={revealRef}
      className="mx-auto max-w-6xl px-5 py-16 md:py-24"
    >
      <span data-reveal className="label-mono text-accent">
        01 — The Story
      </span>
      <h2
        data-reveal
        className="mt-3 max-w-2xl font-display text-4xl font-extrabold leading-tight sm:text-5xl"
      >
        One kounter. A hundred different kultures.
      </h2>
      <p
        data-reveal
        className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground"
      >
        Koffee Kulture started as a simple idea from founder Amina Akef: people
        who share nothing else still share a koffee kup. Since then it's grown
        into a multi-branch specialty koffee and breakfast konsept across Kairo,
        Sheikh Zayed and the North Koast — and it swapped the paper kup for
        something you'd actually want to hold.
      </p>

      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {POINTS.map((p) => (
          <article
            key={p.title}
            data-reveal
            className="kk-card rounded-2xl border border-border bg-card p-6"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
              <p.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-display text-xl font-bold">{p.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {p.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
