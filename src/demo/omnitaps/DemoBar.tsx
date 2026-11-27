import { Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  CalendarCheck,
  LayoutDashboard,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import LogoMark from "../../components/LogoMark";
import { CUSTOMER_PERSONAS, OPS_PERSONAS } from "./constants";
import { useDemo } from "./store";
import { cn } from "./ui";

export default function DemoBar() {
  const { state, customer, opsPersona, actions } = useDemo();
  const location = useLocation();
  const isOps = location.pathname.startsWith("/demo/omnitaps/operations");

  const handleReset = () => {
    actions.resetDemo();
    toast.success("Demo data reset", {
      description: "Seed bookings, waitlist, tables, and the service clock are back to their opening state.",
    });
  };

  return (
    <header className="ot-demo-bar sticky top-0 z-[80] border-b border-white/10 bg-ink text-white">
      <div className="mx-auto flex min-h-14 max-w-[1500px] flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 sm:px-5">
        <Link
          to="/demo/omnitaps"
          className="group flex min-w-0 items-center gap-2.5"
          aria-label="Omnitaps reservations demo home"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-white/10">
            <LogoMark className="h-5 w-5" />
          </span>
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="font-display text-[15px] font-semibold tracking-[-0.01em]">Omnitaps</span>
            <span className="hidden font-mono text-[9px] uppercase tracking-[0.2em] text-white/50 sm:inline">
              Reservations demo
            </span>
          </span>
        </Link>

        <div
          className="ml-auto flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] p-1"
          role="tablist"
          aria-label="Demo point of view"
        >
          <Link
            to="/demo/omnitaps"
            role="tab"
            aria-selected={!isOps}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition",
              !isOps
                ? "bg-white text-ink shadow-sm"
                : "text-white/65 hover:bg-white/10 hover:text-white",
            )}
          >
            <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Customer
          </Link>
          <Link
            to="/demo/omnitaps/operations"
            role="tab"
            aria-selected={isOps}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition",
              isOps
                ? "bg-white text-ink shadow-sm"
                : "text-white/65 hover:bg-white/10 hover:text-white",
            )}
          >
            <LayoutDashboard className="h-3.5 w-3.5" aria-hidden="true" />
            Enterprise
          </Link>
        </div>

        <label className="relative flex items-center">
          <span className="sr-only">{isOps ? "Operations persona" : "Customer persona"}</span>
          <Sparkles
            className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-white/45"
            aria-hidden="true"
          />
          <select
            value={isOps ? opsPersona.id : customer.id}
            onChange={(event) => {
              if (isOps) actions.setActiveOpsPersona(event.target.value);
              else actions.setActiveCustomer(event.target.value);
            }}
            className="max-w-[185px] appearance-none rounded-lg border border-white/15 bg-white/[0.07] py-1.5 pl-8 pr-7 text-[12px] font-medium text-white outline-none transition hover:bg-white/10 focus:border-white/40"
          >
            {isOps
              ? OPS_PERSONAS.map((persona) => (
                  <option key={persona.id} value={persona.id}>
                    {persona.name} · {persona.role}
                  </option>
                ))
              : CUSTOMER_PERSONAS.map((persona) => (
                  <option key={persona.id} value={persona.id}>
                    {persona.name} · {persona.tier}
                  </option>
                ))}
          </select>
          <span className="pointer-events-none absolute right-2.5 text-[9px] text-white/50" aria-hidden="true">
            ▼
          </span>
        </label>

        <span className="hidden items-center gap-1.5 text-[10px] font-medium text-white/55 md:inline-flex">
          <span className="ot-live-dot h-1.5 w-1.5 rounded-full bg-emerald-400 text-emerald-400" aria-hidden="true" />
          Live state
          <span className="text-white/25">·</span>
          <span className="font-mono tabular-nums text-white/40">rev {state.revision}</span>
        </span>

        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1.5 text-[12px] font-medium text-white/75 transition hover:border-white/35 hover:bg-white/10 hover:text-white"
          title="Reset demo data"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Reset</span>
        </button>

        <Link
          to="/demo"
          className="hidden items-center gap-1.5 text-[11px] text-white/50 transition hover:text-white lg:inline-flex"
        >
          <ArrowLeft className="h-3 w-3" aria-hidden="true" />
          All demos
        </Link>
      </div>
    </header>
  );
}
