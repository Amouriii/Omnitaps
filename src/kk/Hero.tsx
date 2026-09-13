import { useEffect, useRef } from "react";
import { Button } from "../kk/ui/button";
import kan from "../kk/assets/koffee-kan-real.jpg";
import { gsap } from "../../lib/kk-gsap-config";
import { Magnetic } from "../kk/Magnetic";

const MARQUEE = [
  "Koffee Kan",
  "Kold Klassics",
  "Kroissants",
  "Kappuccino",
  "Breakfast Kulture",
  "Different Koffee Kups",
];

export function Hero() {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const headlineRef = useRef<HTMLHeadingElement | null>(null);
  // Parallax lives on a WRAPPER around the image, not the image itself —
  // the image already has the `float-kan` CSS transform animation, and
  // GSAP setting `transform` directly on the same element would fight it.
  const kanParallaxRef = useRef<HTMLDivElement | null>(null);
  const kanIntroRef = useRef<HTMLDivElement | null>(null);
  const orbitRef = useRef<SVGCircleElement | null>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const lines =
      headlineRef.current?.querySelectorAll<HTMLElement>("[data-line]") ?? [];
    const supporting =
      contentRef.current?.querySelectorAll<HTMLElement>("[data-hero-reveal]") ?? [];

    if (reduceMotion) {
      lines.forEach((line) => {
        line.style.transform = "none";
      });
      return;
    }
    if (lines.length === 0) return;

    const ctx = gsap.context(() => {
      // Staggered line reveal, on load — each line masked by its parent's
      // overflow-hidden and slides up into place.
      gsap.set(lines, { yPercent: 115 });
      gsap.to(lines, {
        yPercent: 0,
        duration: 0.48,
        ease: "power3.out",
        stagger: 0.07,
        delay: 0.1,
      });

      gsap.fromTo(
        supporting,
        { opacity: 0, y: 18 },
        {
          opacity: 1,
          y: 0,
          duration: 0.42,
          stagger: 0.06,
          delay: 0.18,
          ease: "power3.out",
        },
      );

      if (kanIntroRef.current) {
        gsap.fromTo(
          kanIntroRef.current,
          { opacity: 0, scale: 0.94, y: 20 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.48,
            delay: 0.16,
            ease: "power3.out",
          },
        );
      }

      // Subtle parallax on the kan image wrapper, tied to scroll position —
      // drifts slightly slower than the page as the visitor scrolls past.
      if (kanParallaxRef.current) {
        gsap.to(kanParallaxRef.current, {
          yPercent: -12,
          scale: 0.92,
          rotation: 3,
          ease: "none",
          scrollTrigger: {
            trigger: kanParallaxRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        });
      }

      if (orbitRef.current) {
        gsap.to(orbitRef.current, {
          duration: 7,
          ease: "none",
          repeat: -1,
          motionPath: {
            path: "#hero-orbit-path",
            align: "#hero-orbit-path",
            alignOrigin: [0.5, 0.5],
            autoRotate: true,
          },
        });
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <section id="top" className="terrazzo-soft relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-12 md:grid-cols-2 md:pb-24 md:pt-20">
        <div ref={contentRef}>
          <span
            data-hero-reveal
            className="label-mono inline-block rounded-full bg-primary px-3 py-1 text-primary-foreground"
          >
            Kairo · Sheikh Zayed · North Koast
          </span>
          <h1
            ref={headlineRef}
            className="mt-5 font-display text-5xl font-extrabold leading-[0.95] sm:text-6xl lg:text-7xl"
          >
            <span className="block overflow-hidden">
              <span data-line className="block">
                Different People,
              </span>
            </span>
            <span className="block overflow-hidden">
              <span data-line className="block">
                Different <span className="text-accent">Kultures</span>,
              </span>
            </span>
            <span className="block overflow-hidden">
              <span data-line className="block">
                Different Koffee Kups.
              </span>
            </span>
          </h1>
          <p
            data-hero-reveal
            className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground"
          >
            Specialty Koffee and Breakfast Kulture — poured into our signature
            clear can-shaped Koffee Kan. Now taking orders direct, no middleman.
          </p>
          <div data-hero-reveal className="mt-7 flex flex-wrap gap-3">
            <Magnetic className="inline-flex">
              <Button asChild size="lg">
                <a href="#order">Order a Koffee Kan</a>
              </Button>
            </Magnetic>
            <Magnetic className="inline-flex" strength={0.12}>
              <Button asChild size="lg" variant="outline">
                <a href="#menu">See the Menu</a>
              </Button>
            </Magnetic>
          </div>
          <p data-hero-reveal className="label-mono mt-6 text-muted-foreground">
            Founded by Amina Akef
          </p>
        </div>

        <div ref={kanParallaxRef} className="relative flex justify-center">
          <div className="absolute inset-x-6 top-8 -z-10 aspect-square rounded-full bg-primary/60 blur-2xl" />
          <svg
            aria-hidden="true"
            viewBox="0 0 500 500"
            className="pointer-events-none absolute -inset-8 h-[calc(100%+4rem)] w-[calc(100%+4rem)] overflow-visible"
          >
            <path
              id="hero-orbit-path"
              d="M 70 280 C 90 90, 405 55, 445 240 C 475 390, 190 465, 65 335"
              fill="none"
              stroke="currentColor"
              strokeDasharray="4 12"
              className="text-accent/50"
            />
            <circle ref={orbitRef} r="8" className="fill-accent" />
          </svg>
          <div
            ref={kanIntroRef}
            className="w-64 max-w-full sm:w-80 lg:w-[26rem]"
          >
            <img
              src={kan}
              alt="Two branded Koffee Kulture glass Koffee Kans, one iced latte and one matcha"
              width={1921}
              height={3415}
              className="h-[22rem] w-full rounded-[2rem] object-cover object-[center_72%] shadow-2xl shadow-ink/30 sm:h-[28rem] lg:h-[32rem]"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden border-y border-border bg-accent py-2.5">
        <div className="marquee-track whitespace-nowrap">
          {[...MARQUEE, ...MARQUEE].map((word, i) => (
            <span key={i} className="label-mono px-6 text-accent-foreground">
              {word} ✳
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
