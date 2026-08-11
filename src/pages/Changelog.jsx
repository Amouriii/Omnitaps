import React from "react";
import ChangelogList from "../components/ChangelogList";
import { Link } from "react-router-dom";

export default function Changelog() {
  return (
    <main id="main" className="min-h-screen bg-porcelain text-ink font-body" tabIndex="-1">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display font-semibold text-[28px]">Changelog</h1>
            <p className="text-[15px] text-ink-muted">Recent product updates and release notes.</p>
          </div>
          <div>
            <Link to="/" className="text-sm font-semibold text-ink-muted hover:text-ink">Back to home</Link>
          </div>
        </div>

        <ChangelogList />
      </div>
    </main>
  );
}
