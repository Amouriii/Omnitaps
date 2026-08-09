import React from "react";
import changelog from "../data/changelog";

export default function ChangelogList() {
  return (
    <section className="max-w-6xl mx-auto px-5 sm:px-8 py-16">
      <div className="max-w-xl mb-8">
        <h1 className="font-display font-semibold text-[28px] text-ink">What's new</h1>
        <p className="text-[15px] text-ink-muted">Recent improvements and product updates.</p>
      </div>

      <ul className="space-y-6">
        {changelog.map((c) => (
          <li key={c.id} className="bg-surface border border-hairline rounded-xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-semibold text-[17px] text-ink">{c.title}</h3>
                <p className="text-[14px] text-ink-muted mt-2">{c.summary}</p>
              </div>
              <time className="font-mono text-[12px] text-ink-faint">{c.date}</time>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
