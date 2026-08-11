"use client";

/**
 * REFERENCE (Next.js App Router) — not executed by the Vite SPA.
 * Live review funnel: src/pages/ReviewGate.jsx at /r/:tenantId/review
 */
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, ExternalLink, MessageSquareText, ShieldAlert, Star } from "lucide-react";

type ReviewPageProps = {
  params: {
    tenantId: string;
  };
  searchParams?: Record<string, string | string[] | undefined>;
};

type FeedbackFormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

const STAR_VALUES = [1, 2, 3, 4, 5] as const;
const LOW_RATING_LIMIT = 3;

const INITIAL_FORM_STATE: FeedbackFormState = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

function firstQueryValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function safeText(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function formatTenantName(tenantId: string): string {
  return tenantId
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildGoogleReviewUrl(searchParams: Record<string, string | string[] | undefined> | undefined, tenantId: string) {
  const googleReviewUrl = firstQueryValue(searchParams?.googleReviewUrl);
  const reviewUrl = firstQueryValue(searchParams?.reviewUrl);
  const googleUrl = firstQueryValue(searchParams?.googleUrl);
  const placeId = firstQueryValue(searchParams?.googlePlaceId) ?? firstQueryValue(searchParams?.placeId);
  const businessName = safeText(
    firstQueryValue(searchParams?.businessName) ?? firstQueryValue(searchParams?.name) ?? firstQueryValue(searchParams?.title),
    formatTenantName(tenantId),
  );

  if (googleReviewUrl || reviewUrl || googleUrl) {
    return {
      url: googleReviewUrl ?? reviewUrl ?? googleUrl ?? "",
      label: businessName,
    };
  }

  if (placeId) {
    return {
      url: `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`,
      label: businessName,
    };
  }

  return {
    url: `https://www.google.com/search?q=${encodeURIComponent(`${businessName} reviews`)}`,
    label: businessName,
  };
}

export default function ReviewPage({ params, searchParams }: ReviewPageProps) {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [formData, setFormData] = useState<FeedbackFormState>(INITIAL_FORM_STATE);
  const [submitted, setSubmitted] = useState(false);
  const feedbackHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const reviewTarget = useMemo(() => buildGoogleReviewUrl(searchParams, params.tenantId), [params.tenantId, searchParams]);
  const ratingLabel = selectedRating ? `${selectedRating}-star review` : "review";
  const businessLabel = reviewTarget.label;
  const showFeedbackForm = selectedRating !== null && selectedRating <= LOW_RATING_LIMIT;

  useEffect(() => {
    if (showFeedbackForm) {
      feedbackHeadingRef.current?.focus();
    }
  }, [showFeedbackForm]);

  function handleRatingSelection(rating: number) {
    setSelectedRating(rating);
    setSubmitted(false);

    if (rating >= 4) {
      if (typeof window !== "undefined") {
        window.location.assign(reviewTarget.url);
      }
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#faf9f7_0%,#f4f7fb_58%,#eef2f8_100%)] text-ink">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top_left,rgba(21,94,239,0.16),transparent_40%),radial-gradient(circle_at_top_right,rgba(184,135,59,0.14),transparent_38%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 sm:px-8 lg:py-10">
        <header className="mb-10 flex items-center justify-between gap-4 border-b border-hairline pb-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-tap">Private review funnel</p>
            <h1 className="mt-2 font-display text-[28px] font-semibold tracking-[-0.02em] sm:text-[34px]">
              Tell us how {businessLabel} did.
            </h1>
          </div>
          <div className="hidden rounded-full border border-hairline bg-surface px-3 py-2 text-[12px] text-ink-muted shadow-[0_12px_30px_-22px_rgba(18,21,26,0.35)] sm:block">
            Tenant: <span className="font-mono text-ink">{params.tenantId}</span>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="space-y-6">
            <div className="rounded-3xl border border-hairline bg-surface p-6 shadow-[0_28px_60px_-42px_rgba(18,21,26,0.38)] sm:p-8">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-hairline bg-porcelain px-3 py-1.5 text-[12px] font-medium text-ink-muted">
                <ShieldAlert className="h-4 w-4 text-brass-dark" />
                Select a star rating to continue
              </div>

              <div className="max-w-xl">
                <h2 className="font-display text-[26px] font-semibold tracking-[-0.02em] sm:text-[32px]">
                  One quick tap decides where your feedback goes.
                </h2>
                <p className="mt-4 text-[15px] leading-[1.7] text-ink-muted sm:text-[16px]">
                  Ratings of 4 or 5 stars go straight to Google. Ratings of 1 to 3 stars reveal an internal feedback form so your team can follow up privately.
                </p>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-5">
                {STAR_VALUES.map((rating) => {
                  const isSelected = selectedRating === rating;
                  return (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => handleRatingSelection(rating)}
                      aria-label={`${rating} star${rating === 1 ? "" : "s"}`}
                      aria-pressed={isSelected}
                      className={`group flex min-h-24 flex-col items-center justify-center rounded-2xl border px-4 py-4 text-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-tap focus:ring-offset-2 focus:ring-offset-surface ${
                        isSelected
                          ? "border-tap bg-tap-soft shadow-[0_20px_45px_-34px_rgba(21,94,239,0.55)]"
                          : "border-hairline bg-porcelain hover:-translate-y-0.5 hover:border-hairline-strong hover:bg-white"
                      }`}
                    >
                      <Star className={`h-7 w-7 ${isSelected ? "fill-brass text-brass" : "text-brass-dark/70"}`} />
                      <span className="mt-3 text-[13px] font-semibold text-ink">{rating}</span>
                      <span className="mt-1 text-[11px] uppercase tracking-[0.16em] text-ink-faint">
                        {rating === 5 ? "Excellent" : rating === 4 ? "Great" : rating === 3 ? "Okay" : rating === 2 ? "Poor" : "Bad"}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3 text-[13px] text-ink-muted">
                <span className="inline-flex items-center gap-2 rounded-full bg-tap-soft px-3 py-1.5 text-tap">
                  <ArrowRight className="h-4 w-4" />
                  4-5 stars continue to Google
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-brass-soft px-3 py-1.5 text-brass-dark">
                  <MessageSquareText className="h-4 w-4" />
                  1-3 stars open private feedback
                </span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-hairline bg-surface p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">What happens next</p>
                <h3 className="mt-3 font-display text-[20px] font-semibold">Fast path for happy customers</h3>
                <p className="mt-2 text-[14px] leading-[1.7] text-ink-muted">
                  High ratings go straight to the configured Google review destination without an extra step.
                </p>
              </div>
              <div className="rounded-3xl border border-hairline bg-surface p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">Low rating path</p>
                <h3 className="mt-3 font-display text-[20px] font-semibold">Private feedback for the team</h3>
                <p className="mt-2 text-[14px] leading-[1.7] text-ink-muted">
                  When the experience needs attention, the form appears here so the issue can be handled internally.
                </p>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-hairline bg-surface p-6 shadow-[0_28px_60px_-42px_rgba(18,21,26,0.38)] sm:p-8">
              {!selectedRating ? (
                <div className="flex min-h-[26rem] flex-col items-center justify-center text-center">
                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-tap-soft text-tap">
                    <Star className="h-8 w-8 fill-current" />
                  </div>
                  <h2 className="font-display text-[24px] font-semibold tracking-[-0.02em]">Choose a rating to start</h2>
                  <p className="mt-3 max-w-sm text-[15px] leading-[1.7] text-ink-muted">
                    Tap a star above. If it is 4 or 5, we send you to Google immediately. If it is 1 to 3, the feedback form appears here.
                  </p>
                </div>
              ) : showFeedbackForm ? (
                <div>
                  <h2 ref={feedbackHeadingRef} tabIndex={-1} className="font-display text-[24px] font-semibold tracking-[-0.02em] outline-none">
                    Tell us what went wrong
                  </h2>
                  <p className="mt-3 text-[15px] leading-[1.7] text-ink-muted">
                    Thanks for the honest {ratingLabel}. This stays internal and helps the team follow up quickly.
                  </p>

                  {submitted ? (
                    <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
                      <div className="flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="h-5 w-5" />
                        Feedback captured
                      </div>
                      <p className="mt-2 text-[14px] leading-[1.7] text-emerald-900/90">
                        Your message has been recorded for the internal team. If you need to send it somewhere else, wire this form to your internal intake endpoint or inbox.
                      </p>
                    </div>
                  ) : (
                    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                      <label className="block">
                        <span className="mb-2 block text-[13px] font-medium text-ink">Name</span>
                        <input
                          value={formData.name}
                          onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                          className="w-full rounded-2xl border border-hairline bg-porcelain px-4 py-3 text-[15px] text-ink placeholder:text-ink-faint focus:border-tap focus:outline-none"
                          placeholder="Optional"
                          type="text"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-[13px] font-medium text-ink">Email</span>
                        <input
                          value={formData.email}
                          onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
                          className="w-full rounded-2xl border border-hairline bg-porcelain px-4 py-3 text-[15px] text-ink placeholder:text-ink-faint focus:border-tap focus:outline-none"
                          placeholder="Optional"
                          type="email"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-[13px] font-medium text-ink">Subject</span>
                        <input
                          value={formData.subject}
                          onChange={(event) => setFormData((current) => ({ ...current, subject: event.target.value }))}
                          className="w-full rounded-2xl border border-hairline bg-porcelain px-4 py-3 text-[15px] text-ink placeholder:text-ink-faint focus:border-tap focus:outline-none"
                          placeholder="What should the team know?"
                          type="text"
                          required
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-[13px] font-medium text-ink">Feedback</span>
                        <textarea
                          value={formData.message}
                          onChange={(event) => setFormData((current) => ({ ...current, message: event.target.value }))}
                          className="min-h-36 w-full rounded-2xl border border-hairline bg-porcelain px-4 py-3 text-[15px] text-ink placeholder:text-ink-faint focus:border-tap focus:outline-none"
                          placeholder="Tell us what happened and how we can make it right."
                          required
                        />
                      </label>

                      <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-ink-muted">
                        Send private feedback
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                <div className="flex min-h-[26rem] flex-col items-center justify-center text-center">
                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-tap-soft text-tap">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h2 className="font-display text-[24px] font-semibold tracking-[-0.02em]">Heading to Google</h2>
                  <p className="mt-3 max-w-sm text-[15px] leading-[1.7] text-ink-muted">
                    We are redirecting you to leave a public review for {businessLabel}.
                  </p>
                </div>
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
