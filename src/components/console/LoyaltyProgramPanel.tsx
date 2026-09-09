import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Gift, History, Plus, Settings2, UserRound } from "lucide-react";
import { getSupabaseClient } from "../../services/supabaseClient";

interface LoyaltyProgram { id: string; name: string; pointsName: string; earnRate: number; welcomePoints: number; primaryColor: string; isActive: boolean; }
interface Reward { id: string; name: string; description: string | null; valueText: string | null; pointsCost: number; isActive: boolean; }
interface Member { id: string; memberNumber: string; firstName: string; lastName: string | null; email: string | null; pointsBalance: number; lifetimePoints: number; tier: string; status: string; }
interface Transaction { id: string; memberId: string; transactionType: string; pointsChange: number; description: string; createdAt: string; }
interface Payload { ok?: boolean; error?: string; program?: LoyaltyProgram | null; rewards?: Reward[]; members?: Member[]; transactions?: Transaction[]; member?: Member; reward?: Reward; }

const inputClass = "w-full rounded-xl border border-hairline bg-porcelain px-3 py-2.5 text-[14px] text-ink placeholder:text-ink-faint focus:border-tap focus:outline-none";

export default function LoyaltyProgramPanel({ enterpriseId, role }: { enterpriseId: string; role: string }) {
  const [, setProgram] = useState<LoyaltyProgram | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [programForm, setProgramForm] = useState({ name: "Harbor Lane Rewards", pointsName: "beans", earnRate: "1", welcomePoints: "500", primaryColor: "#c45c26" });
  const [rewardForm, setRewardForm] = useState({ name: "", description: "", valueText: "", pointsCost: "" });
  const [memberForm, setMemberForm] = useState({ firstName: "", lastName: "", memberNumber: "", email: "" });
  const [showReward, setShowReward] = useState(false);
  const [showMember, setShowMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const canWrite = role === "enterprise_admin" || role === "super_admin";

  const request = useCallback(async (body?: Record<string, unknown>) => {
    const { data } = await getSupabaseClient().auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Your session has expired. Sign in again.");
    const response = await fetch("/api/loyalty/program", { method: body ? "POST" : "GET", headers: { Accept: "application/json", Authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify({ enterprise_id: enterpriseId, ...body }) : undefined, cache: "no-store" });
    const payload = (await response.json()) as Payload;
    if (!response.ok || payload.ok === false) throw new Error(payload.error || `Loyalty request failed (${response.status})`);
    return payload;
  }, [enterpriseId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await request();
      setProgram(payload.program || null); setRewards(payload.rewards || []); setMembers(payload.members || []); setTransactions(payload.transactions || []);
      if (payload.program) setProgramForm({ name: payload.program.name, pointsName: payload.program.pointsName, earnRate: String(payload.program.earnRate), welcomePoints: String(payload.program.welcomePoints), primaryColor: payload.program.primaryColor });
      setError("");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load loyalty program."); } finally { setLoading(false); }
  }, [request]);
  useEffect(() => { void load(); }, [load]);

  const submit = async (event: FormEvent, action: string, values: Record<string, unknown>, message: string) => {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try { const payload = await request({ action, ...values }); if (payload.program) setProgram(payload.program); if (payload.reward) setRewards((current) => [payload.reward!, ...current]); if (payload.member) setMembers((current) => [payload.member!, ...current]); setNotice(message); } catch (err) { setError(err instanceof Error ? err.message : "Unable to save loyalty change."); } finally { setBusy(false); }
  };

  if (loading) return <div className="rounded-3xl border border-hairline bg-surface p-8 text-[14px] text-ink-muted" role="status">Loading loyalty program…</div>;

  return <div className="grid gap-6">
    {error ? <p className="rounded-2xl border border-brass/25 bg-brass-soft px-4 py-3 text-[14px] text-brass-dark" role="alert">{error}</p> : null}
    {notice ? <p className="rounded-2xl border border-tap/10 bg-tap-soft px-4 py-3 text-[14px] text-tap" role="status">{notice}</p> : null}
    <section className="rounded-3xl border border-hairline bg-surface p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-tap">Loyalty engine</p><h2 className="mt-2 font-display text-[22px] font-semibold">Program settings</h2><p className="mt-2 max-w-2xl text-[14px] leading-[1.7] text-ink-muted">Set the earning rhythm, welcome moment, and language customers see in Wallet, QR flows, and campaigns.</p></div><div className="rounded-2xl bg-tap-soft p-3 text-tap"><Settings2 size={22} /></div></div>
      <form onSubmit={(event) => void submit(event, "save_program", { name: programForm.name, pointsName: programForm.pointsName, earnRate: Number(programForm.earnRate), welcomePoints: Number(programForm.welcomePoints), primaryColor: programForm.primaryColor }, "Loyalty program saved.")} className="mt-6 grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className="mb-2 block text-[12px] font-medium text-ink-muted">Program name</span><input required disabled={!canWrite || busy} className={inputClass} value={programForm.name} onChange={(event) => setProgramForm((current) => ({ ...current, name: event.target.value }))} /></label><label><span className="mb-2 block text-[12px] font-medium text-ink-muted">Point name</span><input required disabled={!canWrite || busy} className={inputClass} value={programForm.pointsName} onChange={(event) => setProgramForm((current) => ({ ...current, pointsName: event.target.value }))} /></label><label><span className="mb-2 block text-[12px] font-medium text-ink-muted">Earn per $1</span><input required min="0.01" max="100" step="0.01" type="number" disabled={!canWrite || busy} className={inputClass} value={programForm.earnRate} onChange={(event) => setProgramForm((current) => ({ ...current, earnRate: event.target.value }))} /></label><label><span className="mb-2 block text-[12px] font-medium text-ink-muted">Welcome bonus</span><input min="0" type="number" disabled={!canWrite || busy} className={inputClass} value={programForm.welcomePoints} onChange={(event) => setProgramForm((current) => ({ ...current, welcomePoints: event.target.value }))} /></label><label><span className="mb-2 block text-[12px] font-medium text-ink-muted">Brand color</span><input type="color" disabled={!canWrite || busy} className="h-11 w-full rounded-xl border border-hairline bg-porcelain px-2" value={programForm.primaryColor} onChange={(event) => setProgramForm((current) => ({ ...current, primaryColor: event.target.value }))} /></label>{canWrite ? <button disabled={busy} type="submit" className="btn-primary inline-flex w-fit items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold"><Settings2 size={15} /> Save settings</button> : <p className="text-[13px] text-ink-muted">View-only access. An enterprise admin can edit settings.</p>}</form>
    </section>

    <section className="rounded-3xl border border-hairline bg-surface p-6 sm:p-8"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">Rewards catalog</p><h2 className="mt-2 font-display text-[22px] font-semibold">{rewards.length} rewards live</h2></div>{canWrite ? <button type="button" onClick={() => setShowReward((open) => !open)} className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold"><Plus size={15} /> Add reward</button> : null}</div>
      {showReward ? <form onSubmit={(event) => void submit(event, "save_reward", { name: rewardForm.name, description: rewardForm.description, valueText: rewardForm.valueText, pointsCost: Number(rewardForm.pointsCost) }, "Reward added to the catalog.")} className="mt-6 grid gap-4 rounded-2xl border border-hairline bg-porcelain/70 p-4 sm:grid-cols-2"><label><span className="mb-2 block text-[12px] font-medium text-ink-muted">Reward name</span><input required className={inputClass} value={rewardForm.name} onChange={(event) => setRewardForm((current) => ({ ...current, name: event.target.value }))} placeholder="Free pastry" /></label><label><span className="mb-2 block text-[12px] font-medium text-ink-muted">Points cost</span><input required min="1" type="number" className={inputClass} value={rewardForm.pointsCost} onChange={(event) => setRewardForm((current) => ({ ...current, pointsCost: event.target.value }))} /></label><label><span className="mb-2 block text-[12px] font-medium text-ink-muted">Value label</span><input className={inputClass} value={rewardForm.valueText} onChange={(event) => setRewardForm((current) => ({ ...current, valueText: event.target.value }))} placeholder="Any pastry" /></label><label><span className="mb-2 block text-[12px] font-medium text-ink-muted">Description</span><input className={inputClass} value={rewardForm.description} onChange={(event) => setRewardForm((current) => ({ ...current, description: event.target.value }))} placeholder="A small thank you" /></label><button type="submit" disabled={busy} className="btn-primary w-fit rounded-xl px-4 py-2.5 text-[13px] font-semibold">Create reward</button></form> : null}
      <div className="mt-6 grid gap-3 md:grid-cols-3">{rewards.map((reward) => <div key={reward.id} className="rounded-2xl border border-hairline bg-porcelain p-4"><div className="flex items-start justify-between gap-3"><Gift size={17} className="text-tap" /><span className="font-mono text-[11px] text-tap">{reward.pointsCost.toLocaleString()} pts</span></div><p className="mt-4 text-[14px] font-semibold">{reward.name}</p><p className="mt-1 text-[12px] leading-[1.5] text-ink-muted">{reward.description || reward.valueText || "Member reward"}</p></div>)}</div>
    </section>

    <section className="rounded-3xl border border-hairline bg-surface p-6 sm:p-8"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">Members</p><h2 className="mt-2 font-display text-[22px] font-semibold">{members.length} members enrolled</h2></div>{canWrite ? <button type="button" onClick={() => setShowMember((open) => !open)} className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold"><UserRound size={15} /> Add member</button> : null}</div>
      {showMember ? <form onSubmit={(event) => void submit(event, "create_member", { firstName: memberForm.firstName, lastName: memberForm.lastName, memberNumber: memberForm.memberNumber, email: memberForm.email }, "Member enrolled with the welcome bonus.")} className="mt-6 grid gap-4 rounded-2xl border border-hairline bg-porcelain/70 p-4 sm:grid-cols-2"><label><span className="mb-2 block text-[12px] font-medium text-ink-muted">First name</span><input required className={inputClass} value={memberForm.firstName} onChange={(event) => setMemberForm((current) => ({ ...current, firstName: event.target.value }))} /></label><label><span className="mb-2 block text-[12px] font-medium text-ink-muted">Last name</span><input className={inputClass} value={memberForm.lastName} onChange={(event) => setMemberForm((current) => ({ ...current, lastName: event.target.value }))} /></label><label><span className="mb-2 block text-[12px] font-medium text-ink-muted">Member number</span><input required className={inputClass} value={memberForm.memberNumber} onChange={(event) => setMemberForm((current) => ({ ...current, memberNumber: event.target.value }))} placeholder="HL-00428" /></label><label><span className="mb-2 block text-[12px] font-medium text-ink-muted">Email</span><input type="email" className={inputClass} value={memberForm.email} onChange={(event) => setMemberForm((current) => ({ ...current, email: event.target.value }))} /></label><button type="submit" disabled={busy} className="btn-primary w-fit rounded-xl px-4 py-2.5 text-[13px] font-semibold">Enroll member</button></form> : null}
      {members.length ? <div className="mt-6 divide-y divide-hairline">{members.map((member) => <div key={member.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div className="flex items-center gap-3"><div className="rounded-xl bg-tap-soft p-2 text-tap"><UserRound size={17} /></div><div><p className="font-medium">{member.firstName} {member.lastName || ""} <span className="font-mono text-[12px] text-ink-faint">{member.memberNumber}</span></p><p className="mt-1 text-[13px] text-ink-muted">{member.pointsBalance.toLocaleString()} pts · {member.tier} · {member.status}</p></div></div><span className="rounded-full bg-tap-soft px-3 py-1 font-mono text-[11px] text-tap">{member.lifetimePoints.toLocaleString()} lifetime</span></div>)}</div> : <p className="mt-6 rounded-2xl bg-porcelain px-4 py-3 text-[14px] text-ink-muted">No members enrolled yet.</p>}
    </section>

    <section className="rounded-3xl border border-hairline bg-surface p-6 sm:p-8"><div className="flex items-center gap-2"><History size={17} className="text-tap" /><h2 className="font-display text-[20px] font-semibold">Recent point activity</h2></div>{transactions.length ? <div className="mt-4 divide-y divide-hairline">{transactions.slice(0, 8).map((transaction) => <div key={transaction.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-[13px] font-medium">{transaction.description}</p><p className="text-[11px] text-ink-faint">{new Date(transaction.createdAt).toLocaleString()}</p></div><span className={`font-mono text-[12px] ${transaction.pointsChange > 0 ? "text-tap" : "text-brass-dark"}`}>{transaction.pointsChange > 0 ? "+" : ""}{transaction.pointsChange}</span></div>)}</div> : <p className="mt-4 text-[14px] text-ink-muted">Point activity will appear here as members earn and redeem.</p>}</section>
  </div>;
}
