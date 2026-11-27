import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  Check,
  Clock,
  Coffee,
  CreditCard,
  Gift,
  Hourglass,
  Mail,
  MessageCircle,
  Phone,
  Send,
  Sparkles,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { customerNotifications, customerReservations, useDemo } from "../store";
import { formatDateLong, formatRelative, formatTime } from "../time";
import type { DemoNotification } from "../types";
import { EmptyState, SectionHeading, StatusPill, cn, inputClass } from "../ui";

function NotificationIcon({ kind }: { kind: DemoNotification["kind"] }) {
  const icons = {
    booking: CalendarCheck,
    status: ArrowRight,
    waitlist: Hourglass,
    reminder: Bell,
    message: MessageCircle,
    insight: Sparkles,
  } as const;
  const Icon = icons[kind] ?? Bell;
  return <Icon className="h-4 w-4" aria-hidden="true" />;
}

export default function Updates({ onViewReservations }: { onViewReservations: () => void }) {
  const { state, customer, actions } = useDemo();
  const notifications = useMemo(
    () => customerNotifications(state, customer.id),
    [customer.id, state],
  );
  const unread = notifications.filter((notification) => !notification.read);
  const reservations = useMemo(
    () => customerReservations(state, customer.id),
    [customer.id, state],
  );
  const next = reservations
    .filter(
      (reservation) =>
        ["pending", "confirmed", "checked_in", "seated", "waitlisted"].includes(reservation.status) &&
        new Date(reservation.startTime).getTime() >= new Date(state.demoNow).getTime() - 60 * 60_000,
    )
    .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];

  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (message.trim().length < 2) {
      toast.error("Add a short message for the team.");
      return;
    }
    setSending(true);
    try {
      actions.messageConcierge(message);
      setMessage("");
      toast.success("Message sent to the floor", {
        description: "A host will reply by phone or email. The message appears in the enterprise inbox.",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send that message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6 sm:py-12">
      <SectionHeading
        eyebrow="Live updates"
        title="From the Harbor Lane floor"
        description="Check-ins, table changes, reminders, and waitlist movement land here the moment they happen."
        actions={
          unread.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                actions.markAllRead();
                toast.success("All updates marked as read");
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-3.5 py-2 text-[12px] font-medium text-ink-muted transition hover:border-hairline-strong hover:text-ink"
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Mark all read
            </button>
          ) : null
        }
      />

      <div className="mt-7 grid gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-start">
        <div>
          {next ? (
            <button
              type="button"
              onClick={onViewReservations}
              className="mb-5 flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-tap/25 bg-tap-soft/40 px-4 py-3.5 text-left transition hover:border-tap/50"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-tap text-white">
                  <CalendarCheck className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="flex flex-wrap items-center gap-2 text-[12.5px] font-semibold">
                    Your next booking
                    <StatusPill status={next.status} />
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-ink-muted">
                    {formatDateLong(next.startTime)} · {formatTime(next.startTime)} · {next.partySize} guests
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.14em] text-tap">
                View <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </span>
            </button>
          ) : null}

          {notifications.length === 0 ? (
            <EmptyState
              icon={<Bell className="h-5 w-5" aria-hidden="true" />}
              title="Nothing new yet"
              description="When you book, check in, or move a table, the floor's updates show up here."
            />
          ) : (
            <div className="space-y-2.5">
              {notifications.map((notification) => (
                <article
                  key={notification.id}
                  className={cn(
                    "rounded-2xl border px-4 py-4 transition",
                    notification.read
                      ? "border-hairline bg-surface/70"
                      : "border-tap/25 bg-tap-soft/25 shadow-[0_12px_30px_-28px_rgba(196,92,38,0.5)]",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        notification.read ? "bg-porcelain text-ink-muted" : "bg-tap text-white",
                      )}
                    >
                      <NotificationIcon kind={notification.kind} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-[13px] font-semibold leading-snug">{notification.title}</p>
                        <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.08em] text-ink-faint">
                          {formatRelative(notification.createdAt, state.demoNow)}
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] leading-[1.7] text-ink-muted">{notification.body}</p>
                      {!notification.read ? (
                        <button
                          type="button"
                          onClick={() => actions.markNotificationRead(notification.id)}
                          className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-medium text-tap transition hover:text-tap-dark"
                        >
                          <Check className="h-3 w-3" aria-hidden="true" />
                          Mark read
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <section className="rounded-3xl border border-hairline bg-surface p-5">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-tap">Concierge</p>
            <h2 className="mt-1.5 font-display text-[22px] font-semibold leading-tight">
              A real person, if you want one.
            </h2>
            <p className="mt-2 text-[12px] leading-[1.7] text-ink-muted">
              Send a note to the floor. It lands in the enterprise inbox and a host replies by phone
              or email.
            </p>
            <form onSubmit={sendMessage} className="mt-4">
              <label htmlFor="concierge-message" className="sr-only">
                Message to the floor
              </label>
              <textarea
                id="concierge-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={3}
                maxLength={800}
                placeholder="Allergies, a pram, a surprise — tell us what would make the visit easier."
                className={cn(inputClass, "resize-none")}
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="font-mono text-[9px] text-ink-faint">{message.length}/800</span>
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex items-center gap-1.5 rounded-full bg-tap px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-tap-dark disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  Send
                </button>
              </div>
            </form>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a
                href="tel:+201004821160"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-hairline px-2 py-2 text-[11px] font-medium text-ink-muted transition hover:border-hairline-strong hover:text-ink"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                Call
              </a>
              <a
                href="mailto:hello@democafe.example"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-hairline px-2 py-2 text-[11px] font-medium text-ink-muted transition hover:border-hairline-strong hover:text-ink"
              >
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                Email
              </a>
            </div>
          </section>

          <section className="rounded-3xl border border-hairline bg-surface/70 p-5">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-tap">Before you arrive</p>
            <h2 className="mt-1.5 font-display text-[20px] font-semibold">Around your visit</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                { to: "/menu/demo", label: "Menu", icon: Coffee },
                { to: "/r/demo/wifi", label: "Wi‑Fi", icon: Wifi },
                { to: "/demo/loyalty", label: "Loyalty", icon: Gift },
                { to: "/demo/wallet", label: "Member pass", icon: CreditCard },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex items-center gap-2 rounded-xl border border-hairline bg-porcelain/60 px-2.5 py-2.5 text-[11.5px] font-medium transition hover:border-tap/40"
                  >
                    <Icon className="h-3.5 w-3.5 text-tap" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-hairline bg-surface/70 p-5">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-tap">Good to know</p>
            <div className="mt-2 divide-y divide-hairline">
              {[
                {
                  question: "Can I change my booking?",
                  answer:
                    "Yes. Open My reservations, then Modify or Move. Changes are checked against live table availability before they save.",
                },
                {
                  question: "How does the waitlist work?",
                  answer:
                    "When a table is released, the first matching party is offered it automatically — party size, time and zone are all considered. VIPs are flagged for the floor.",
                },
                {
                  question: "Do I pay now?",
                  answer:
                    "No. This is a table reservation, not a prepaid ticket. Settle at the table after your visit.",
                },
                {
                  question: "Where do I find my table?",
                  answer:
                    "Show the QR pass at the host stand. If the floor changes your table, the pass and your updates reflect it immediately.",
                },
              ].map((item) => (
                <details key={item.question} className="group py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[12px] font-semibold marker:hidden">
                    {item.question}
                    <Clock className="h-3.5 w-3.5 shrink-0 text-ink-faint transition group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <p className="mt-2 text-[11.5px] leading-[1.7] text-ink-muted">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
