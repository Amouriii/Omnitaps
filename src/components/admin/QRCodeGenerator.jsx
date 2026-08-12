import { useId, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

/**
 * Generates a QR code pointing at the live guest menu `/menu/:restaurantId`.
 *
 * @param {Object} props
 * @param {string} props.restaurantId slug or enterprise UUID used in the public menu URL
 * @param {number} [props.size]
 * @param {string} [props.className]
 */
export default function QRCodeGenerator({ restaurantId, size = 220, className = "" }) {
  const labelId = useId();
  const canvasHostRef = useRef(null);
  const [downloadError, setDownloadError] = useState("");

  const menuUrl = useMemo(() => {
    const id = String(restaurantId || "").trim();
    if (!id || typeof window === "undefined") {
      return "";
    }
    return `${window.location.origin}/menu/${encodeURIComponent(id)}`;
  }, [restaurantId]);

  function handleDownloadPng() {
    setDownloadError("");
    const canvas = canvasHostRef.current?.querySelector("canvas");
    if (!canvas) {
      setDownloadError("QR canvas is not ready yet.");
      return;
    }

    try {
      const link = document.createElement("a");
      const safeName = String(restaurantId || "menu")
        .trim()
        .replace(/[^a-z0-9-_]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
      link.download = `omnitaps-menu-qr-${safeName || "menu"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      setDownloadError(
        err instanceof Error ? err.message : "Unable to download QR image.",
      );
    }
  }

  if (!menuUrl) {
    return (
      <div className={`rounded-3xl border border-hairline bg-surface p-6 ${className}`}>
        <h2 className="font-display text-[20px] font-semibold">Menu QR code</h2>
        <p className="mt-2 text-[14px] text-ink-muted">
          A restaurant id is required to generate the QR code.
        </p>
      </div>
    );
  }

  return (
    <section
      className={`rounded-3xl border border-hairline bg-surface p-6 sm:p-8 ${className}`}
      aria-labelledby={labelId}
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 id={labelId} className="font-display text-[20px] font-semibold">
            Menu QR code
          </h2>
          <p className="mt-2 text-[14px] leading-[1.7] text-ink-muted">
            Guests scan this code to open the live menu. Updates from the admin panel appear
            automatically.
          </p>
          <p className="mt-3 break-all font-mono text-[12px] text-ink-faint">{menuUrl}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDownloadPng}
              className="rounded-xl bg-tap px-4 py-2.5 text-[13px] font-medium text-white hover:bg-tap-dark"
            >
              Download PNG
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(menuUrl);
                } catch {
                  setDownloadError("Unable to copy link.");
                }
              }}
              className="rounded-xl border border-hairline px-4 py-2.5 text-[13px] font-medium hover:border-hairline-strong"
            >
              Copy link
            </button>
          </div>
          {downloadError ? (
            <p className="mt-3 text-[13px] text-brass-dark" role="alert">
              {downloadError}
            </p>
          ) : null}
        </div>

        <div
          ref={canvasHostRef}
          className="mx-auto shrink-0 rounded-2xl border border-hairline bg-white p-4 sm:mx-0"
        >
          <QRCodeCanvas
            value={menuUrl}
            size={size}
            level="H"
            marginSize={2}
            bgColor="#ffffff"
            fgColor="#12151a"
            title={`QR code for ${menuUrl}`}
          />
        </div>
      </div>
    </section>
  );
}
