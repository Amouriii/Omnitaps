import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main id="main" className="min-h-screen flex items-center justify-center bg-porcelain text-ink p-8" tabIndex="-1">
      <div className="max-w-2xl text-center">
        <h1 className="font-display font-semibold text-[36px] mb-4">Page not found</h1>
        <p className="text-[16px] text-ink-muted mb-8">Sorry — we couldn't find the page you were looking for.</p>
        <div className="flex justify-center gap-3">
          <Link to="/" className="btn-primary rounded-lg px-6 py-3 text-[15px] font-semibold">Home</Link>
          <Link to="/changelog" className="btn-ghost rounded-lg px-6 py-3 text-[15px] font-semibold">What's new</Link>
        </div>
      </div>
    </main>
  );
}
