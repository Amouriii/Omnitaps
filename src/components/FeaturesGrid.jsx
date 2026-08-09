import React from "react";
import { Link } from "react-router-dom";
import { items } from "../data/items";

export default function FeaturesGrid({ itemsList = items }) {
  return (
    <section id="features" className="max-w-6xl mx-auto px-5 sm:px-8 py-10">
      <div className="max-w-xl mb-6">
        <h2 className="font-display font-semibold text-[24px] text-ink">Features</h2>
        <p className="text-[15px] text-ink-muted">Key product modules at a glance.</p>
      </div>

      <div className="grid md:grid-cols-6 gap-4">
        {itemsList.map((s) => (
          <Link
            to={`/items/${s.id}`}
            key={s.id}
            className={`bento-card block cursor-pointer ${s.col} rounded-2xl border border-hairline bg-surface p-7 focus:outline-none`}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="w-11 h-11 rounded-xl bg-tap-soft text-tap flex items-center justify-center">
                {/* icons are defined in Home; we intentionally keep markup neutral so parent can provide icons if needed */}
                <span aria-hidden className="w-5 h-5" />
              </div>
              <span className="card-dot w-1.5 h-1.5 rounded-full bg-hairline-strong" />
            </div>
            <h3 className="font-display font-semibold text-[17px] text-ink mb-2">{s.title}</h3>
            <p className="text-[14.5px] leading-[1.6] text-ink-muted">{s.desc}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
