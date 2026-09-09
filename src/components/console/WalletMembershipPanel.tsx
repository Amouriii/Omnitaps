import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CreditCard, ExternalLink, Plus, ShieldCheck, UserRound, X } from "lucide-react";
import { getSupabaseClient } from "../../services/supabaseClient";

interface WalletProgram {
  id: string;
  name: string;
  programType: string;
  logoText: string | null;
  primaryColor: string;
  backgroundColor: string;
  labelColor: string;
  barcodeFormat: string;
  supportUrl: string | null;
  isActive: boolean;
}

interface WalletMember {
  id: string;
  memberNumber: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  tier: string | null;
  expiresAt: string | null;
  status: string;
  downloadPath?: string;
  downloadToken?: string;
}

interface ApiPayload {
  ok?: boolean;
  error?: string;
  program?: WalletProgram | null;
  members?: WalletMember[];
  member?: WalletMember;
}

const fieldClass =
  "w-full rounded-xl border border-hairline bg-porcelain px-3 py-2.5 text-[14px] text-ink placeholder:text-ink-faint focus:border-tap focus:outline-none";

function programDefaults(program: WalletProgram | null): Record<string, string> {
  return {
    name: program?.name || "",
    programType: program?.programType || "membership",
    primaryColor: program?.primaryColor || "#155eef",
    backgroundColor: program?.backgroundColor || "#12151a",
    labelColor: program?.labelColor || "#ffffff",
    barcodeFormat: program?.barcodeFormat || "QR",
    supportUrl: program?.supportUrl || "",
  };
}

function formatStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function WalletMembershipPanel({
  enterpriseId,
  role,
}: {
  enterpriseId: string;
  role: string;
}) {
  const [program, setProgram] = useState<WalletProgram | null>(null);
  const [members, setMembers] = useState<WalletMember[]>([]);
  const [programForm, setProgramForm] = useState(() => programDefaults(null));
  const [memberForm, setMemberForm] = useState({
    firstName: "",
    lastName: "",
    memberNumber: "",
    email: "",
    tier: "",
    expiresAt: "",
  });
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const canWrite = role === "enterprise_admin" || role === "super_admin";

  const request = useCallback(
    async (method: string, body?: Record<string, unknown>) => {
      const { data } = await getSupabaseClient().auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Your session has expired. Sign in again.");
      const response = await fetch("/api/wallet/membership", {
        method,
        headers: {
          accept: "application/json",
          authorization: `Bearer ${token}`,
          ...(body ? { "content-type": "application/json" } : {}),
        },
        body: body ? JSON.stringify({ enterprise_id: enterpriseId, ...body }) : undefined,
        cache: "no-store",
      });
      const payload = (await response.json()) as ApiPayload;
      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || `Wallet request failed (${response.status})`);
      }
      return payload;
    },
    [enterpriseId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await request("GET");
      setProgram(payload.program || null);
      setProgramForm(programDefaults(payload.program || null));
      setMembers(payload.members || []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load wallet membership.");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveProgram = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const payload = await request("POST", { action: "save_program", ...programForm });
      setProgram(payload.program || null);
      setNotice("Wallet program saved. New cards will use this branding.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save program.");
    } finally {
      setBusy(false);
    }
  };

  const createMember = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const payload = await request("POST", { action: "create_member", ...memberForm });
      if (payload.member) {
        setMembers((current) => [payload.member!, ...current]);
        setNotice("Member created. Use Add to Apple Wallet to deliver the card link.");
      }
      setMemberForm({ firstName: "", lastName: "", memberNumber: "", email: "", tier: "", expiresAt: "" });
      setShowMemberForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create member.");
    } finally {
      setBusy(false);
    }
  };

  const issueLink = async (member: WalletMember) => {
    setBusy(true);
    setError("");
    try {
      const payload = await request("POST", { action: "issue_link", member_id: member.id });
      if (payload.member) {
        setMembers((current) => current.map((item) => (item.id === member.id ? payload.member! : item)));
        setNotice("Secure Wallet link issued. Share it with the member once.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to issue Wallet link.");
    } finally {
      setBusy(false);
    }
  };

  const revokeMember = async (member: WalletMember) => {
    if (!window.confirm(`Revoke ${member.firstName}'s membership card?`)) return;
    setBusy(true);
    try {
      const payload = await request("PATCH", { member_id: member.id, status: "revoked" });
      if (payload.member) {
        setMembers((current) => current.map((item) => (item.id === member.id ? payload.member! : item)));
      }
      setNotice("Membership revoked. Its wallet download now returns inactive.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to revoke membership.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="rounded-3xl border border-hairline bg-surface p-8 text-[14px] text-ink-muted" role="status">Loading Wallet membership…</div>;
  }

  return (
    <div className="grid gap-6">
      {error ? <p className="rounded-2xl border border-brass/25 bg-brass-soft px-4 py-3 text-[14px] text-brass-dark" role="alert">{error}</p> : null}
      {notice ? <p className="rounded-2xl border border-tap/10 bg-tap-soft px-4 py-3 text-[14px] text-tap" role="status">{notice}</p> : null}

      <section className="rounded-3xl border border-hairline bg-surface p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-tap">Apple Wallet</p>
            <h2 className="mt-2 font-display text-[22px] font-semibold tracking-[-0.02em]">Membership card program</h2>
          <p className="mt-2 text-[12px] text-ink-faint">{program?.isActive ? "Active for new and existing members" : "Not active"}</p>
            <p className="mt-2 max-w-2xl text-[14px] leading-[1.7] text-ink-muted">Create branded QR or barcode cards for a rewards program, gym, sports club, or retail membership. Card secrets stay server-side.</p>
          </div>
          <div className="rounded-2xl bg-tap-soft p-3 text-tap"><CreditCard size={22} aria-hidden="true" /></div>
        </div>

        <form onSubmit={saveProgram} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className="mb-2 block text-[12px] font-medium text-ink-muted">Program name</span><input required disabled={!canWrite || busy} className={fieldClass} value={programForm.name} onChange={(event) => setProgramForm((current) => ({ ...current, name: event.target.value }))} placeholder="Harbor Lane Rewards" /></label>
          <label><span className="mb-2 block text-[12px] font-medium text-ink-muted">Program type</span><select disabled={!canWrite || busy} className={fieldClass} value={programForm.programType} onChange={(event) => setProgramForm((current) => ({ ...current, programType: event.target.value }))}><option value="membership">Membership</option><option value="rewards">Rewards</option><option value="gym">Gym</option><option value="sports_club">Sports club</option></select></label>
          <label><span className="mb-2 block text-[12px] font-medium text-ink-muted">Barcode</span><select disabled={!canWrite || busy} className={fieldClass} value={programForm.barcodeFormat} onChange={(event) => setProgramForm((current) => ({ ...current, barcodeFormat: event.target.value }))}><option>QR</option><option>PDF417</option><option>CODE128</option><option>AZTEC</option></select></label>
          <label><span className="mb-2 block text-[12px] font-medium text-ink-muted">Card color</span><input disabled={!canWrite || busy} type="color" className="h-11 w-full rounded-xl border border-hairline bg-porcelain px-2" value={programForm.primaryColor} onChange={(event) => setProgramForm((current) => ({ ...current, primaryColor: event.target.value }))} /></label>
          <label><span className="mb-2 block text-[12px] font-medium text-ink-muted">Background</span><input disabled={!canWrite || busy} type="color" className="h-11 w-full rounded-xl border border-hairline bg-porcelain px-2" value={programForm.backgroundColor} onChange={(event) => setProgramForm((current) => ({ ...current, backgroundColor: event.target.value }))} /></label>
          <label className="sm:col-span-2"><span className="mb-2 block text-[12px] font-medium text-ink-muted">Support URL (optional)</span><input disabled={!canWrite || busy} type="url" className={fieldClass} value={programForm.supportUrl} onChange={(event) => setProgramForm((current) => ({ ...current, supportUrl: event.target.value }))} placeholder="https://example.com/support" /></label>
          {canWrite ? <button disabled={busy} type="submit" className="btn-primary inline-flex w-fit items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold disabled:opacity-60"><ShieldCheck size={15} /> Save program</button> : <p className="text-[13px] text-ink-muted">View-only access. An enterprise admin can edit this program.</p>}
        </form>
      </section>

      <section className="rounded-3xl border border-hairline bg-surface p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">Members</p><h2 className="mt-2 font-display text-[22px] font-semibold">{members.length} cards issued</h2></div>
          {canWrite ? <button type="button" onClick={() => setShowMemberForm((open) => !open)} className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold"><Plus size={15} /> Add member</button> : null}
        </div>

        {showMemberForm ? <form onSubmit={createMember} className="mt-6 grid gap-4 rounded-2xl border border-hairline bg-porcelain/70 p-4 sm:grid-cols-2"><label><span className="mb-2 block text-[12px] font-medium text-ink-muted">First name</span><input required className={fieldClass} value={memberForm.firstName} onChange={(event) => setMemberForm((current) => ({ ...current, firstName: event.target.value }))} /></label><label><span className="mb-2 block text-[12px] font-medium text-ink-muted">Last name</span><input className={fieldClass} value={memberForm.lastName} onChange={(event) => setMemberForm((current) => ({ ...current, lastName: event.target.value }))} /></label><label><span className="mb-2 block text-[12px] font-medium text-ink-muted">Member number</span><input required className={fieldClass} value={memberForm.memberNumber} onChange={(event) => setMemberForm((current) => ({ ...current, memberNumber: event.target.value }))} placeholder="HL-00042" /></label><label><span className="mb-2 block text-[12px] font-medium text-ink-muted">Email (optional)</span><input type="email" className={fieldClass} value={memberForm.email} onChange={(event) => setMemberForm((current) => ({ ...current, email: event.target.value }))} /></label><label><span className="mb-2 block text-[12px] font-medium text-ink-muted">Tier</span><input className={fieldClass} value={memberForm.tier} onChange={(event) => setMemberForm((current) => ({ ...current, tier: event.target.value }))} placeholder="Gold" /></label><label><span className="mb-2 block text-[12px] font-medium text-ink-muted">Expires (optional)</span><input type="date" className={fieldClass} value={memberForm.expiresAt} onChange={(event) => setMemberForm((current) => ({ ...current, expiresAt: event.target.value }))} /></label><div className="flex gap-2 sm:col-span-2"><button type="submit" disabled={busy} className="btn-primary rounded-xl px-4 py-2.5 text-[13px] font-semibold disabled:opacity-60">{busy ? "Creating…" : "Create card"}</button><button type="button" onClick={() => setShowMemberForm(false)} className="rounded-xl border border-hairline px-4 py-2.5 text-[13px] font-medium"><X size={14} className="mr-1 inline" />Cancel</button></div></form> : null}

        {members.length === 0 ? <p className="mt-6 rounded-2xl bg-porcelain px-4 py-3 text-[14px] text-ink-muted">No members yet. Add the first card to generate a secure Wallet download link.</p> : <div className="mt-6 divide-y divide-hairline">{members.map((member) => <div key={member.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div className="flex items-center gap-3"><div className="rounded-xl bg-tap-soft p-2 text-tap"><UserRound size={17} /></div><div><p className="font-medium">{[member.firstName, member.lastName].filter(Boolean).join(" ")} <span className="font-mono text-[12px] text-ink-faint">{member.memberNumber}</span></p><p className="mt-1 text-[13px] text-ink-muted">{member.tier || "Standard"}{member.expiresAt ? ` · through ${member.expiresAt}` : ""} · {formatStatus(member.status)}</p></div></div><div className="flex flex-wrap gap-2">{member.downloadPath ? <a href={member.downloadPath} className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-porcelain px-3 py-2 text-[12px] font-semibold text-ink hover:border-tap" download><ExternalLink size={14} /> Add to Wallet</a> : canWrite && member.status === "active" ? <button type="button" disabled={busy} onClick={() => void issueLink(member)} className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-porcelain px-3 py-2 text-[12px] font-semibold text-ink hover:border-tap disabled:opacity-60"><ExternalLink size={14} /> Issue link</button> : null}{canWrite && member.status !== "revoked" ? <button type="button" disabled={busy} onClick={() => void revokeMember(member)} className="rounded-xl border border-brass/30 bg-brass-soft px-3 py-2 text-[12px] font-semibold text-brass-dark disabled:opacity-60">Revoke</button> : null}</div></div>)}</div>}
      </section>
    </div>
  );
}
