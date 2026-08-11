import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { configured, isAuthenticated, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const redirectTo = location.state?.from || "/admin";

  if (!loading && isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await signIn(email.trim(), password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err?.message || "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#faf9f7_0%,#eef2f8_100%)] text-ink">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
        <div className="mb-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-tap">OmniTaps admin</p>
          <h1 className="mt-2 font-display text-[32px] font-semibold tracking-[-0.02em]">Sign in</h1>
          <p className="mt-3 text-[15px] leading-[1.7] text-ink-muted">
            Enterprise operators only. Guest menu, review, and Wi‑Fi pages stay public.
          </p>
        </div>

        {!configured ? (
          <div className="rounded-3xl border border-hairline bg-surface p-6" role="alert">
            <p className="text-[15px] leading-[1.7] text-ink-muted">
              Auth is not configured. Add Supabase URL and anon key to your environment, then restart.
            </p>
            <Link to="/" className="mt-4 inline-block text-[14px] text-tap hover:underline">
              Back to home
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-3xl border border-hairline bg-surface p-6 shadow-[0_28px_60px_-42px_rgba(18,21,26,0.35)]">
            <label className="block">
              <span className="mb-2 block text-[13px] font-medium">Email</span>
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-hairline bg-porcelain px-4 py-3 text-[15px] focus:border-tap focus:outline-none"
                disabled={submitting}
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-2 block text-[13px] font-medium">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-hairline bg-porcelain px-4 py-3 text-[15px] focus:border-tap focus:outline-none"
                disabled={submitting}
              />
            </label>

            {error ? (
              <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-900" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-ink px-5 py-3.5 text-[15px] font-semibold text-white disabled:opacity-70"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}

        <Link to="/" className="mt-6 text-center text-[14px] text-ink-muted hover:text-ink">
          ← Back to marketing site
        </Link>
      </div>
    </main>
  );
}
