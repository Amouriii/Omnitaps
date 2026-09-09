import { Link, useSearchParams } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

export default function WalletMember() {
  const [params] = useSearchParams();
  const token = params.get("token")?.trim() || "";
  const downloadPath = token ? `/api/wallet/membership/${encodeURIComponent(token)}` : "";

  return (
    <div className="min-h-screen flex flex-col bg-porcelain text-ink font-body">
      <SiteHeader showTryDemos={false} />
      <main id="main" className="flex-1" tabIndex={-1}>
        <div className="mx-auto flex max-w-3xl flex-col items-center px-5 py-16 text-center sm:px-8 sm:py-24">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ink text-white shadow-[0_24px_44px_-24px_rgba(18,21,26,0.65)]" aria-hidden="true">
            <span className="text-2xl">⌁</span>
          </div>
          <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.18em] text-tap">Digital membership</p>
          <h1 className="mt-3 font-display text-[34px] font-semibold tracking-[-0.02em] sm:text-[44px]">Your membership, one tap away.</h1>
          <p className="mt-4 max-w-xl text-[16px] leading-[1.7] text-ink-muted">Save your store, gym, rewards, or club card to Apple Wallet. The QR or barcode can be scanned at the door or counter, while the membership status stays under the operator’s control.</p>
          {downloadPath ? <a href={downloadPath} className="btn-primary mt-8 inline-flex items-center rounded-xl px-6 py-3.5 text-[15px] font-semibold" download>Add to Apple Wallet <span className="ml-2" aria-hidden="true">→</span></a> : <div className="mt-8 rounded-2xl border border-brass/25 bg-brass-soft px-5 py-4 text-left text-[14px] text-brass-dark" role="alert">This membership link is incomplete. Ask the operator to resend your card link.</div>}
          <div className="mt-12 grid w-full gap-4 text-left sm:grid-cols-3"><div className="rounded-2xl border border-hairline bg-surface p-5"><p className="font-mono text-[11px] uppercase tracking-[0.14em] text-tap">01</p><h2 className="mt-3 font-semibold">Save</h2><p className="mt-2 text-[13px] leading-[1.6] text-ink-muted">Tap Add to Apple Wallet on your iPhone.</p></div><div className="rounded-2xl border border-hairline bg-surface p-5"><p className="font-mono text-[11px] uppercase tracking-[0.14em] text-tap">02</p><h2 className="mt-3 font-semibold">Scan</h2><p className="mt-2 text-[13px] leading-[1.6] text-ink-muted">Show the QR or barcode wherever membership is accepted.</p></div><div className="rounded-2xl border border-hairline bg-surface p-5"><p className="font-mono text-[11px] uppercase tracking-[0.14em] text-tap">03</p><h2 className="mt-3 font-semibold">Stay current</h2><p className="mt-2 text-[13px] leading-[1.6] text-ink-muted">Operators can pause or revoke a card without exposing personal data in the URL.</p></div></div>
          <Link to="/" className="mt-10 text-[14px] font-medium text-tap hover:text-ink">Powered by Omnitaps</Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
