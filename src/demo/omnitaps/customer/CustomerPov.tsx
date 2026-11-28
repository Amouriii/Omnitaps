import { useEffect, useMemo, useState } from "react";
import { Bell, CalendarPlus, Compass, Ticket, User } from "lucide-react";
import { customerNotifications, useDemo } from "../store";
import { cn } from "../ui";
import AccountOverview from "./AccountOverview";
import BookingFlow from "./BookingFlow";
import Discover from "./Discover";
import MyReservations from "./MyReservations";
import Updates from "./Updates";

type CustomerTab = "discover" | "book" | "reservations" | "updates" | "account";

const TABS: Array<{
  id: CustomerTab;
  label: string;
  icon: typeof Compass;
}> = [
  { id: "discover", label: "Discover", icon: Compass },
  { id: "book", label: "Reserve", icon: CalendarPlus },
  { id: "reservations", label: "My reservations", icon: Ticket },
  { id: "updates", label: "Updates", icon: Bell },
  { id: "account", label: "My account", icon: User },
];

export default function CustomerPov() {
  const { state, customer } = useDemo();
  const [tab, setTab] = useState<CustomerTab>("discover");
  const [bookingServiceId, setBookingServiceId] = useState<string | undefined>(undefined);

  const unread = useMemo(
    () => customerNotifications(state, customer.id).filter((notification) => !notification.read).length,
    [customer.id, state],
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [tab]);

  const openBooking = (serviceId?: string) => {
    setBookingServiceId(serviceId);
    setTab("book");
  };

  const initials = customer.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="demo-cafe-theme min-h-screen pb-20">
      <header className="border-b border-hairline bg-surface/75 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 pb-0 pt-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink font-display text-[13px] font-semibold text-[#faf4ea]">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-tap">
                  Demo Café · Harbor Lane
                </p>
                <p className="mt-0.5 truncate font-display text-[19px] font-semibold leading-tight tracking-[-0.01em]">
                  Welcome back, {customer.name.split(" ")[0]}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-brass/30 bg-brass-soft px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-brass-dark">
                {customer.tier} member
              </span>
              <span className="hidden text-[11px] text-ink-muted sm:inline">
                {customer.visits} visits · since {customer.memberSince}
              </span>
            </div>
          </div>

          <nav
            aria-label="Customer portal sections"
            className="ot-date-strip mt-4 flex gap-1 overflow-x-auto"
          >
            {TABS.map((entry) => {
              const Icon = entry.icon;
              const active = tab === entry.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setTab(entry.id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative inline-flex shrink-0 items-center gap-2 rounded-t-xl px-3.5 py-2.5 text-[12.5px] font-medium transition",
                    active
                      ? "bg-porcelain text-ink"
                      : "text-ink-muted hover:bg-tap-soft/50 hover:text-ink",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {entry.label}
                  {entry.id === "updates" && unread > 0 ? (
                    <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-tap px-1 font-mono text-[9px] font-semibold text-white">
                      {unread}
                    </span>
                  ) : null}
                  {active ? (
                    <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-tap" aria-hidden="true" />
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main>
        {tab === "discover" ? (
          <Discover
            onBook={openBooking}
            onViewReservations={() => setTab("reservations")}
            onOpenUpdates={() => setTab("updates")}
          />
        ) : null}
        {tab === "book" ? (
          <BookingFlow
            key={customer.id}
            initialServiceId={bookingServiceId}
            onBack={() => setTab("discover")}
            onViewReservations={() => setTab("reservations")}
          />
        ) : null}
        {tab === "reservations" ? (
          <MyReservations
            onBookAgain={(serviceId) => openBooking(serviceId)}
            onBrowse={() => setTab("discover")}
          />
        ) : null}
        {tab === "updates" ? (
          <Updates onViewReservations={() => setTab("reservations")} />
        ) : null}
        {tab === "account" ? <AccountOverview /> : null}
      </main>
    </div>
  );
}
