import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import ConsoleChrome, { ConsoleStatusCard } from "../components/console/ConsoleChrome";
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
    <ConsoleChrome
      eyebrow="Sign in"
      title="Welcome back"
      subtitle="Manage locations from Admin. Guest menu, reviews, and Wi‑Fi stay public."
      variant="auth"
    >
      {!configured ? (
        <ConsoleStatusCard eyebrow="Setup" title="Sign-in is not configured" role="alert">
          <p>Add the Supabase URL and anon key to your environment, then restart.</p>
          <Link to="/" className="mt-4 inline-block text-[14px] font-medium text-tap hover:text-ink">
            Back to home
          </Link>
        </ConsoleStatusCard>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mx-auto max-w-md rounded-3xl border border-hairline bg-surface p-6 shadow-[0_28px_60px_-42px_rgba(18,21,26,0.38)] sm:p-8"
        >
          <label className="block">
            <span className="mb-2 block font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
              Email
            </span>
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-hairline bg-porcelain px-4 py-3 text-[15px] focus:border-tap focus:outline-none"
              disabled={submitting}
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
              Password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-hairline bg-porcelain px-4 py-3 text-[15px] focus:border-tap focus:outline-none"
              disabled={submitting}
            />
          </label>

          {error ? (
            <p
              className="mt-4 rounded-xl border border-brass/25 bg-brass-soft px-4 py-3 text-[14px] text-brass-dark"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary mt-6 inline-flex w-full items-center justify-center rounded-xl px-5 py-3.5 text-[15px] font-semibold disabled:opacity-70"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      )}
    </ConsoleChrome>
  );
}
