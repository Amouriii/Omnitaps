// import { useState } from "react";
// import "./App.css";

// /* ================================================================== */
// /*  Logo mark — concentric "tap" ripple, single currentColor path set  */
// /*  so it can be dropped into light or dark contexts unchanged.        */
// /* ================================================================== */
// function LogoMark({ className = "" }) {
//   return (
//     <svg
//       viewBox="0 0 40 40"
//       fill="none"
//       className={className}
//       xmlns="http://www.w3.org/2000/svg"
//       aria-hidden="true"
//     >
//       <circle cx="13" cy="27" r="4.5" fill="#3A36E0" />
//       <path
//         d="M19.5 27C19.5 20.6487 24.6487 15.5 31 15.5"
//         stroke="#3A36E0"
//         strokeWidth="3.2"
//         strokeLinecap="round"
//       />
//       <path
//         d="M19.5 33.5C19.5 23.2827 27.7827 15 38 15"
//         stroke="#FF8A34"
//         strokeWidth="3.2"
//         strokeLinecap="round"
//         opacity="0.5"
//       />
//     </svg>
//   );
// }

// function Logo({ word = "text-ink" }) {
//   return (
//     <a href="#top" className="flex items-center gap-2.5 shrink-0" aria-label="OmniTaps home">
//       <LogoMark className="w-7 h-7" />
//       <span className={`font-display font-semibold text-[19px] tracking-tight ${word}`}>
//         OmniTaps
//       </span>
//     </a>
//   );
// }

// /* ================================================================== */
// /*  Service icons — hand-drawn, consistent 1.6 stroke, no dependencies */
// /* ================================================================== */
// const icons = {
//   website: (p) => (
//     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
//       <rect x="3" y="5" width="18" height="14" rx="2" />
//       <path d="M3 9.2h18" />
//       <path d="M9.6 12.8 7.6 15l2 2.2" />
//       <path d="M14.4 12.8 16.4 15l-2 2.2" />
//     </svg>
//   ),
//   qrMenu: (p) => (
//     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
//       <rect x="3" y="3" width="7" height="7" rx="1.2" />
//       <rect x="14" y="3" width="7" height="7" rx="1.2" />
//       <rect x="3" y="14" width="7" height="7" rx="1.2" />
//       <path d="M14 15h3v3h-3zM19.5 14v3.2M14 19.5h2.2M18 19.5h2.5v1.5" />
//     </svg>
//   ),
//   chatbot: (p) => (
//     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
//       <path d="M4 6.2A2.7 2.7 0 0 1 6.7 3.5h10.6A2.7 2.7 0 0 1 20 6.2v6.6a2.7 2.7 0 0 1-2.7 2.7H10l-4.3 3.6v-3.6H6.7A2.7 2.7 0 0 1 4 12.8z" />
//       <path d="M12.3 7.6 13 9.3l1.7.7-1.7.7-.7 1.7-.7-1.7-1.7-.7 1.7-.7z" strokeWidth="1.1" />
//     </svg>
//   ),
//   reservations: (p) => (
//     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
//       <rect x="3" y="5" width="18" height="16" rx="2" />
//       <path d="M3 9.5h18" />
//       <path d="M8 3v4M16 3v4" />
//       <path d="M8.3 14.5 10.3 16.5 15 12" />
//     </svg>
//   ),
//   reviews: (p) => (
//     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
//       <path d="M12 21s6.75-5.77 6.75-11.25a6.75 6.75 0 0 0-13.5 0C5.25 15.23 12 21 12 21z" />
//       <path d="M12 7.4 13 9.6l2.4.35-1.75 1.65.4 2.4L12 12.85l-2.05 1.15.4-2.4L8.6 9.95 11 9.6z" strokeWidth="1.1" />
//     </svg>
//   ),
//   wifi: (p) => (
//     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" {...p}>
//       <circle cx="10.5" cy="18.5" r="1.3" fill="currentColor" stroke="none" />
//       <path d="M7.2 15.4a4.7 4.7 0 0 1 6.6 0" />
//       <path d="M4.3 12.4a8.9 8.9 0 0 1 12.4 0" />
//       <rect x="16.5" y="3.5" width="4.2" height="4.2" rx="0.7" strokeWidth="1.2" />
//     </svg>
//   ),
// };

// /* ================================================================== */
// /*  Content                                                            */
// /* ================================================================== */
// const NAV_LINKS = [
//   { label: "Solutions", href: "#solutions" },
//   { label: "How it works", href: "#how-it-works" },
//   { label: "Contact", href: "#cta" },
// ];

// const SERVICES = [
//   {
//     icon: "website",
//     title: "Custom Website Development",
//     desc: "A fast, on-brand site built around how customers actually find you — search, maps, and word of mouth. No page-builder clutter to maintain.",
//     col: "md:col-span-4",
//   },
//   {
//     icon: "qrMenu",
//     title: "Digital QR Menus",
//     desc: "Update a price or pull a sold-out dish from your phone. Every table sees it instantly — no reprints.",
//     col: "md:col-span-2",
//   },
//   {
//     icon: "chatbot",
//     title: "AI Customer Service Chatbots",
//     desc: "Trained on your hours, menu, and policies. Answers customers instantly, day or night, and hands off to a person when it should.",
//     col: "md:col-span-3",
//   },
//   {
//     icon: "reservations",
//     title: "Smart Reservation Systems",
//     desc: "Bookings and waitlists that fill themselves in, with reminders that cut no-shows before they happen.",
//     col: "md:col-span-3",
//   },
//   {
//     icon: "reviews",
//     title: "Google Maps Ratings & Review Management",
//     desc: "Every review lands in one inbox. Reply faster and turn happy customers into 5-star ratings automatically.",
//     col: "md:col-span-3",
//   },
//   {
//     icon: "wifi",
//     title: "Instant QR WiFi Access",
//     desc: "Guests join your network with one scan — no passwords, no front-desk calls — while you capture a verified contact.",
//     col: "md:col-span-3",
//   },
// ];

// const STEPS = [
//   {
//     n: "01",
//     title: "Connect",
//     desc: "Add OmniTaps to your site, tables, and entrance in an afternoon. No developers, no downtime.",
//   },
//   {
//     n: "02",
//     title: "Automate",
//     desc: "Chatbots answer questions, reservations fill themselves in, and WiFi access happens with a scan — running quietly in the background.",
//   },
//   {
//     n: "03",
//     title: "Grow",
//     desc: "Reviews, repeat visits, and customer data compound every week, visible in one dashboard instead of six.",
//   },
// ];

// /* ================================================================== */
// /*  Root component                                                     */
// /* ================================================================== */
// export default function App() {
//   const [mobileOpen, setMobileOpen] = useState(false);

//   return (
//     <div id="top" className="min-h-screen w-full bg-porcelain text-ink font-body">
//       {/* ---------------- NAV ---------------- */}
//       <header className="sticky top-0 z-40 border-b border-hairline bg-porcelain/85 backdrop-blur">
//         <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
//           <Logo />

//           <nav className="hidden md:flex items-center gap-8">
//             {NAV_LINKS.map((l) => (
//               <a key={l.label} href={l.href} className="nav-link text-[15px]">
//                 {l.label}
//               </a>
//             ))}
//           </nav>

//           <div className="hidden md:block">
//             <a
//               href="#cta"
//               className="btn-primary rounded-lg px-4.5 py-2.5 text-[14px] font-semibold px-5"
//             >
//               Book a Demo
//             </a>
//           </div>

//           <button
//             type="button"
//             className="md:hidden p-2 -mr-2 text-ink"
//             aria-label={mobileOpen ? "Close menu" : "Open menu"}
//             aria-expanded={mobileOpen}
//             onClick={() => setMobileOpen((v) => !v)}
//           >
//             {mobileOpen ? (
//               <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
//             ) : (
//               <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
//             )}
//           </button>
//         </div>

//         {mobileOpen && (
//           <div className="md:hidden border-t border-hairline bg-porcelain px-5 pb-6 pt-2">
//             <nav className="flex flex-col gap-1">
//               {NAV_LINKS.map((l) => (
//                 <a
//                   key={l.label}
//                   href={l.href}
//                   onClick={() => setMobileOpen(false)}
//                   className="py-2.5 text-[15px] text-ink-muted"
//                 >
//                   {l.label}
//                 </a>
//               ))}
//             </nav>
//             <a
//               href="#cta"
//               onClick={() => setMobileOpen(false)}
//               className="btn-primary mt-3 block text-center rounded-lg px-5 py-3 text-[14px] font-semibold"
//             >
//               Book a Demo
//             </a>
//           </div>
//         )}
//       </header>

//       {/* ---------------- HERO ---------------- */}
//       <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-16 pb-8 md:pt-24 md:pb-16 grid md:grid-cols-2 gap-14 items-center">
//         <div>
//           <div className="font-mono text-[12px] tracking-[0.14em] uppercase text-tap mb-5">
//             Digital infrastructure for hospitality &amp; retail
//           </div>
//           <h1 className="font-display font-semibold text-[40px] leading-[1.08] sm:text-[52px] md:text-[54px] tracking-[-0.02em] text-ink mb-6">
//             Digitize your entire business with one tap.
//           </h1>
//           <p className="text-[17px] leading-[1.6] text-ink-muted max-w-md mb-9">
//             OmniTaps replaces the six different logins, vendors, and subscriptions
//             running your restaurant or store with a single connected platform —
//             website, menus, reservations, reviews, WiFi, and support.
//           </p>
//           <div className="flex flex-wrap items-center gap-3">
//             <a href="#cta" className="btn-primary rounded-lg px-6 py-3.5 text-[15px] font-semibold inline-flex items-center gap-2">
//               Get Started
//               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
//             </a>
//             <a href="#solutions" className="btn-ghost rounded-lg px-6 py-3.5 text-[15px] font-semibold">
//               View Solutions
//             </a>
//           </div>
//           <div className="mt-10 font-mono text-[12px] tracking-wide text-ink-faint">
//             BUILT FOR CAFÉS · BOUTIQUE HOTELS · RESTAURANT GROUPS · RETAIL CHAINS
//           </div>
//         </div>

//         {/* Signature tap-ripple visual */}
//         <div className="relative hidden md:flex items-center justify-center h-[26rem]">
//           <div className="ripple-ring w-40 h-40" />
//           <div className="ripple-ring delay-1 w-64 h-64" />
//           <div className="ripple-ring delay-2 w-[22rem] h-[22rem]" />

//           <div className="relative z-10 w-56 rounded-3xl bg-ink text-porcelain p-6 shadow-[0_32px_64px_-24px_rgba(18,21,26,0.45)]">
//             <LogoMark className="w-6 h-6 text-tap mb-6" />
//             <div className="grid grid-cols-4 gap-1.5 mb-6">
//               {Array.from({ length: 16 }).map((_, i) => (
//                 <span
//                   key={i}
//                   className="aspect-square rounded-[3px]"
//                   style={{
//                     background:
//                       [1, 2, 4, 7, 8, 9, 11, 13, 14].includes(i)
//                         ? "rgba(255,255,255,0.9)"
//                         : "rgba(255,255,255,0.14)",
//                   }}
//                 />
//               ))}
//             </div>
//             <div className="font-mono text-[11px] tracking-widest uppercase text-white/50">
//               Scan to connect
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* ---------------- SERVICES (bento) ---------------- */}
//       <section id="solutions" className="max-w-6xl mx-auto px-5 sm:px-8 py-20 md:py-28">
//         <div className="max-w-xl mb-12">
//           <div className="font-mono text-[12px] tracking-[0.14em] uppercase text-brass-dark mb-3">
//             The platform
//           </div>
//           <h2 className="font-display font-semibold text-[30px] md:text-[36px] tracking-[-0.01em] text-ink mb-4">
//             Six tools your team already needs. One place to run them.
//           </h2>
//           <p className="text-[16px] leading-[1.6] text-ink-muted">
//             Every OmniTaps module shares the same customer record, so a WiFi login,
//             a booking, and a review all build the same picture of who walked in.
//           </p>
//         </div>

//         <div className="grid md:grid-cols-6 gap-4">
//           {SERVICES.map((s) => (
//             <div
//               key={s.title}
//               className={`bento-card ${s.col} rounded-2xl border border-hairline bg-surface p-7`}
//             >
//               <div className="flex items-center justify-between mb-6">
//                 <div className="w-11 h-11 rounded-xl bg-tap-soft text-tap flex items-center justify-center">
//                   {icons[s.icon]({ className: "w-5 h-5" })}
//                 </div>
//                 <span className="card-dot w-1.5 h-1.5 rounded-full bg-hairline-strong" />
//               </div>
//               <h3 className="font-display font-semibold text-[17px] text-ink mb-2">
//                 {s.title}
//               </h3>
//               <p className="text-[14.5px] leading-[1.6] text-ink-muted">{s.desc}</p>
//             </div>
//           ))}
//         </div>
//       </section>

//       {/* ---------------- HOW IT WORKS ---------------- */}
//       <section id="how-it-works" className="border-y border-hairline bg-surface">
//         <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 md:py-28">
//           <div className="max-w-xl mb-14">
//             <div className="font-mono text-[12px] tracking-[0.14em] uppercase text-tap mb-3">
//               How it works
//             </div>
//             <h2 className="font-display font-semibold text-[30px] md:text-[36px] tracking-[-0.01em] text-ink">
//               From tool stack to one tap, in three steps.
//             </h2>
//           </div>

//           <div className="grid md:grid-cols-3 gap-10 md:gap-8">
//             {STEPS.map((s, i) => (
//               <div key={s.n} className="relative">
//                 <div
//                   className="font-display text-[34px] font-semibold mb-4 text-tap-soft"
//                   style={{ WebkitTextStroke: "1.5px var(--color-tap)" }}
//                 >
//                   {s.n}
//                 </div>
//                 <h3 className="font-display font-semibold text-[18px] text-ink mb-2">
//                   {s.title}
//                 </h3>
//                 <p className="text-[14.5px] leading-[1.6] text-ink-muted max-w-xs">
//                   {s.desc}
//                 </p>
//                 {i < STEPS.length - 1 && (
//                   <div className="hidden md:block absolute top-4 right-[-1.1rem] w-4 h-px bg-hairline-strong" />
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* ---------------- BOTTOM CTA ---------------- */}
//       <section id="cta" className="max-w-6xl mx-auto px-5 sm:px-8 py-20 md:py-28">
//         <div className="relative overflow-hidden rounded-3xl bg-ink px-8 py-16 md:px-16 md:py-20 text-center">
//           <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-tap opacity-20 blur-2xl" />
//           <div className="pointer-events-none absolute -bottom-24 -left-14 w-72 h-72 rounded-full bg-brass opacity-15 blur-2xl" />

//           <div className="relative">
//             <h2 className="font-display font-semibold text-[30px] md:text-[42px] leading-[1.1] tracking-[-0.01em] text-white mb-5 max-w-2xl mx-auto">
//               Ready to run your business on one tap?
//             </h2>
//             <p className="text-[16px] text-white/60 max-w-md mx-auto mb-10">
//               Join hospitality and retail teams who replaced their tool stack with
//               a single connected platform.
//             </p>
//             <div className="flex flex-wrap justify-center gap-3">
//               <a href="#top" className="btn-primary rounded-lg px-7 py-3.5 text-[15px] font-semibold">
//                 Get Started
//               </a>
//               <a
//                 href="#top"
//                 className="rounded-lg px-7 py-3.5 text-[15px] font-semibold text-white border border-white/20 hover:border-white/40 transition-colors"
//               >
//                 Talk to Sales
//               </a>
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* ---------------- FOOTER ---------------- */}
//       <footer className="border-t border-hairline">
//         <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 grid sm:grid-cols-2 md:grid-cols-4 gap-10">
//           <div>
//             <Logo />
//             <p className="text-[14.5px] leading-[1.6] text-ink-muted mt-4 max-w-[200px]">
//               Digital infrastructure for hospitality &amp; retail.
//             </p>
//           </div>

//           <div>
//             <div className="font-mono text-[11px] uppercase tracking-widest text-ink-faint mb-4">
//               Product
//             </div>
//             <ul className="space-y-2.5 text-[14.5px]">
//               {["Websites", "QR Menus", "AI Chatbots", "Reservations", "Review Management", "WiFi Access"].map((t) => (
//                 <li key={t}>
//                   <a href="#solutions" className="nav-link">{t}</a>
//                 </li>
//               ))}
//             </ul>
//           </div>

//           <div>
//             <div className="font-mono text-[11px] uppercase tracking-widest text-ink-faint mb-4">
//               Company
//             </div>
//             <ul className="space-y-2.5 text-[14.5px]">
//               {["About", "Careers", "Contact"].map((t) => (
//                 <li key={t}>
//                   <a href="#" className="nav-link">{t}</a>
//                 </li>
//               ))}
//             </ul>
//           </div>

//           <div>
//             <div className="font-mono text-[11px] uppercase tracking-widest text-ink-faint mb-4">
//               Legal
//             </div>
//             <ul className="space-y-2.5 text-[14.5px]">
//               {["Privacy Policy", "Terms of Service"].map((t) => (
//                 <li key={t}>
//                   <a href="#" className="nav-link">{t}</a>
//                 </li>
//               ))}
//             </ul>
//           </div>
//         </div>

//         <div className="max-w-6xl mx-auto px-5 sm:px-8 py-6 border-t border-hairline flex flex-col sm:flex-row justify-between gap-2 text-[13px] text-ink-faint">
//           <span>© {new Date().getFullYear()} OmniTaps, Inc. All rights reserved.</span>
//           <span className="font-mono">Built for businesses that never close.</span>
//         </div>
//       </footer>
//     </div>
//   );
// }

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ItemDetail from "./pages/ItemDetail";
import Changelog from "./pages/Changelog";
import ReviewGate from "./pages/ReviewGate";
import NotFound from "./pages/NotFound";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/items/:id" element={<ItemDetail />} />
        <Route path="/changelog" element={<Changelog />} />
        <Route path="/r/:tenantId/review" element={<ReviewGate />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}