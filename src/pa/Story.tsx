import { useScrollReveal } from "../../lib/pa-hooks/use-scroll-reveal";
import { useKineticScroll } from "../../lib/pa-hooks/use-kinetic-scroll";
import { useNeonFlicker } from "../../lib/pa-motion";

const FACTS = [
  { label: "Cuisine", value: "American × Egyptian" },
  { label: "Scene", value: "Retro neon diner" },
  { label: "Vibe", value: "GTA: San Andreas energy" },
  { label: "Service", value: "Dine-in · Pickup · Delivery" },
];

export function Story() {
  const ref = useScrollReveal<HTMLElement>();
  useKineticScroll(ref, "[data-story-marquee]", 13);
  const headingRef = useNeonFlicker<HTMLHeadingElement>();

  return (
    <section
      id="story"
      ref={ref}
      className="relative isolate overflow-x-clip bg-[#232323] py-20 md:py-28"
    >
      <p
        aria-hidden="true"
        data-story-marquee
        className="pointer-events-none absolute -top-6 left-0 whitespace-nowrap font-display text-[clamp(5rem,15vw,12rem)] leading-none text-white/[0.04]"
      >
        DINER · FUSION · DINER
      </p>

      <div className="relative z-10 mx-auto max-w-6xl px-5">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div data-reveal>
            <span className="label-mono text-[#29D9FF]">01 · The Story</span>
            <h2
              ref={headingRef}
              className="mt-4 font-display text-4xl leading-[1.02] text-white sm:text-5xl"
            >
              Two names.{" "}
              <span className="text-[#F2597F] [text-shadow:0_0_18px_#F2597F88]">
                Two food kultures.
              </span>{" "}
              One counter.
            </h2>
            <p className="mt-6 max-w-xl leading-relaxed text-white/70">
              Pablo & Abdo is the American/Egyptian Diner experience. A real
              neon-lit spot on Omar Ibn El-Khattab in Heliopolis where the
              checkerboard floor meets Cairo street energy. The kind of place
              press has compared to rolling into GTA: San Andreas.
            </p>
            <p className="mt-4 max-w-xl leading-relaxed text-white/70">
              The menu does the fusion honestly: a beef brisket burger next to
              Egyptian shawarma, mac & cheese folded with brisket, savory fteer
              filled like a Philly. Diner classics from the other side of the
              world, made fresh & طازة, here in Cairo.
            </p>
          </div>

          <div className="grid content-start gap-4 sm:grid-cols-2">
            {FACTS.map((f) => (
              <div
                key={f.label}
                data-reveal
                className="pa-card rounded-2xl border border-[#C4C8CC]/25 bg-white/[0.03] p-5"
              >
                <p className="label-mono text-[#29D9FF]/80">{f.label}</p>
                <p className="mt-2 font-display text-lg leading-snug text-white">
                  {f.value}
                </p>
              </div>
            ))}
            <div
              data-reveal
              className="rounded-2xl border-2 border-[#F2597F]/50 bg-[#F2597F]/10 p-5 sm:col-span-2"
            >
              <p className="font-display text-xl text-white">
                This site is our own counter.{" "}
                <span className="text-[#29D9FF]">order direct</span>, skip the
                marketplace commission, and support the real thing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
