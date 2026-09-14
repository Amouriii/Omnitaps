import { useEffect, useLayoutEffect, useRef } from "react";
import { Button } from "../kk/ui/button";
import { gsap, ScrollTrigger } from "../../lib/kk-gsap-config";
import { prefersReducedMotion } from "../../lib/pa-motion";
import { Magnetic } from "./Magnetic";
import { Signage } from "./Signage";

const MARQUEE = [
  "Cheese Fries",
  "Brisket Burger",
  "Shawarma",
  "Philly Cheesesteak",
  "Mac & Cheese",
  "Fresh & طازة",
];

export function Hero() {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const headlineRef = useRef<HTMLHeadingElement | null>(null);
  const signRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const lines =
      headlineRef.current?.querySelectorAll<HTMLElement>("[data-line]");
    const supporting =
      contentRef.current?.querySelectorAll<HTMLElement>("[data-hero-reveal]");

    if (reduceMotion) {
      lines?.forEach((line) => {
        line.style.transform = "none";
      });
      return;
    }
    if (!lines || lines.length === 0 || !supporting) return;

    const ctx = gsap.context(() => {
      // Staggered masked line reveal, on load.
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

      if (signRef.current) {
        gsap.fromTo(
          signRef.current,
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
    });

    return () => ctx.revert();
  }, []);

  /*
   * "Storefront Power" scroll trigger — the sign is a real neon installation:
   * it recedes with scroll, re-strikes with a stepped power-on flicker when
   * you scroll back, and buzzes brighter the faster you scroll past.
   * Opacity/transform only — every frame stays on the compositor.
   */
  const panelRef = useRef<HTMLDivElement | null>(null);
  const surgeRef = useRef<HTMLSpanElement | null>(null);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const surge = surgeRef.current;
    if (!panel || !surge || prefersReducedMotion()) return;

    const tubes = panel.querySelectorAll<HTMLElement>("[data-tube]");

    // The idle .pa-flicker CSS keyframes own opacity too — they would fight
    // the scrubbed timeline (CSS animations beat inline styles). GSAP takes
    // over: disable the keyframes and drive the tubes from scroll alone.
    gsap.set(tubes, { animation: "none" });

    const ctx = gsap.context(() => {
      // 1) Scrubbed exit: sign tips back and recedes as the hero leaves.
      gsap.fromTo(
        panel,
        { rotateX: 0, y: 0 },
        {
          rotateX: 14,
          y: -60,
          ease: "none",
          scrollTrigger: {
            trigger: panel,
            start: "top top",
            end: "bottom 25%",
            scrub: 0.4,
          },
        },
      );

      // 2) Power scrub: the sign is LIT at the top of the page; scrolling
      //    away flickers the tubes out with two dying stutters (a real neon
      //    sign at 1am). Scrolling back up replays it in reverse — the
      //    power-on strike. Scrubbed = position maps exactly to scroll.
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: "#top",
          start: "top top",
          end: "+=520",
          scrub: 0.4,
        },
      });
      tl.to(tubes, { opacity: 0.55, duration: 0.22 })
        .to(tubes, { opacity: 0.95, duration: 0.08 })
        .to(tubes, { opacity: 0.18, duration: 0.28 })
        .to(tubes, { opacity: 0.65, duration: 0.1 })
        .to(tubes, { opacity: 0.07, duration: 0.32 });
    });

    // 3) Velocity surge: quick scroll = power surge through the tubes.
    let surgeTween: gsap.core.Timeline | null = null;
    let velocityTrigger: ScrollTrigger | null = null;
    velocityTrigger = ScrollTrigger.create({
      trigger: "#top",
      start: "top bottom",
      end: "bottom top",
      onUpdate: () => {
        const v = Math.abs(velocityTrigger?.getVelocity() ?? 0);
        if (v < 400) return;
        const boost = Math.min(0.14, (v - 400) / 9000);
        surgeTween?.kill();
        surgeTween = gsap
          .timeline()
          .to(surge, { opacity: boost, duration: 0.12 })
          .to(surge, { opacity: 0, duration: 0.5, ease: "power2.out" });
      },
    });

    return () => {
      velocityTrigger?.kill();
      surgeTween?.kill();
      ctx.revert();
      gsap.set(tubes, { clearProps: "animation,opacity" });
    };
  }, []);

  return (
    <section id="top" className="relative overflow-hidden bg-[#232323]">
      {/* Faint chrome grid lines — steel counter vibe */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(#C4C8CC 1px, transparent 1px), linear-gradient(90deg, #C4C8CC 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 md:grid-cols-[1.15fr_0.85fr] md:pb-28 md:pt-24">
        <div ref={contentRef}>
          <span
            data-hero-reveal
            className="label-mono inline-block rounded-full border border-[#29D9FF]/40 bg-[#29D9FF]/10 px-3 py-1 text-[#29D9FF]"
          >
            Heliopolis · Cairo · Est. on Omar Ibn El-Khattab
          </span>
          <h1
            ref={headlineRef}
            className="mt-6 font-display text-5xl leading-[0.95] text-white sm:text-6xl lg:text-7xl"
          >
            <span className="block overflow-hidden">
              <span data-line className="block">
                <Signage tone="pink">Fresh &</Signage>
              </span>
            </span>
            <span className="block overflow-hidden">
              <span data-line className="block">
                <Signage tone="blue">طازة</Signage>
              </span>
            </span>
            <span className="block overflow-hidden">
              <span
                data-line
                className="mt-2 block text-2xl text-white/70 sm:text-3xl"
              >
                The American/Egyptian Diner experience.
              </span>
            </span>
          </h1>
          <p
            data-hero-reveal
            className="mt-6 max-w-md text-base leading-relaxed text-white/70"
          >
            Diner classics from the other side of the world, fused with Cairo
            street food, served under neon in Heliopolis. Order direct from us,
            no marketplace in between.
          </p>
          <div data-hero-reveal className="mt-8 flex flex-wrap gap-3">
            <Magnetic className="inline-flex">
              <Button asChild size="lg" className="pa-cta">
                <a href="#order">Order Now</a>
              </Button>
            </Magnetic>
            <Magnetic className="inline-flex" strength={0.12}>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-[#C4C8CC]/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <a href="#menu">See the Menu</a>
              </Button>
            </Magnetic>
          </div>
          <p data-hero-reveal className="label-mono mt-7 text-white/40">
            Walk-ins welcome · Delivery & pickup
          </p>
        </div>

        {/* Neon sign composition — the real storefront's vibe, rebuilt in CSS */}
        <div
          ref={signRef}
          className="relative mx-auto w-full max-w-sm [perspective:800px]"
        >
          <div
            ref={panelRef}
            data-sign-panel
            className="pa-neon-sign relative rounded-3xl border-2 border-[#C4C8CC]/60 bg-[#1b1b1b] p-8 shadow-[0_0_80px_rgba(242,89,127,0.25),inset_0_0_40px_rgba(0,0,0,0.6)] [transform-style:preserve-3d]"
          >
            {/* Scroll-velocity surge glow — opacity driven by GSAP only */}
            <span
              ref={surgeRef}
              aria-hidden
              data-sign-surge
              className="pointer-events-none absolute inset-0 rounded-3xl bg-[#F2597F] opacity-0 mix-blend-screen"
            />
            <div
              data-tube
              className="pa-flicker text-center font-display text-4xl leading-tight text-[#F2597F] [text-shadow:0_0_8px_#F2597F,0_0_24px_#F2597F,0_0_64px_#F2597F99]"
            >
              PABLO
            </div>
            <div
              data-tube
              className="mt-1 text-center font-display text-4xl leading-tight text-[#29D9FF] [text-shadow:0_0_8px_#29D9FF,0_0_24px_#29D9FF,0_0_64px_#29D9FF99]"
            >
              & ABDO
            </div>
            <div
              data-tube
              className="mt-4 border-t border-[#C4C8CC]/30 pt-4 text-center font-display text-xl text-[#F2597F] [text-shadow:0_0_12px_#F2597Faa]"
            >
              أمريكن داينر
            </div>
            {/* Mounting screws */}
            <span
              aria-hidden
              className="absolute left-3 top-3 h-2 w-2 rounded-full bg-[#C4C8CC]/70"
            />
            <span
              aria-hidden
              className="absolute right-3 top-3 h-2 w-2 rounded-full bg-[#C4C8CC]/70"
            />
            <span
              aria-hidden
              className="absolute bottom-3 left-3 h-2 w-2 rounded-full bg-[#C4C8CC]/70"
            />
            <span
              aria-hidden
              className="absolute bottom-3 right-3 h-2 w-2 rounded-full bg-[#C4C8CC]/70"
            />
          </div>
          {/* Checkered floor under the sign — the diner's real flooring motif */}
          <div
            aria-hidden
            className="pa-checkerboard mx-auto mt-6 h-14 w-full max-w-[16rem] rounded-b-xl opacity-90"
          />
        </div>
      </div>

      <div className="overflow-hidden border-y-2 border-[#C4C8CC]/30 bg-[#29D9FF]/10 py-3">
        <div className="marquee-track whitespace-nowrap">
          {[...MARQUEE, ...MARQUEE].map((word, i) => (
            <span key={i} className="label-mono px-6 text-[#29D9FF]">
              {word} ✦
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
