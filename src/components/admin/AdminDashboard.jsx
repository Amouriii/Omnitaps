import { useState } from "react";
import { Link } from "react-router-dom";
import { useLiveMenu } from "../../hooks/useLiveMenu";
import {
  deleteQrMenuItem,
  setQrMenuItemAvailability,
} from "../../services/qrMenuService";
import AddMenuItemModal from "./AddMenuItemModal";

/**
 * Enterprise QR food-menu admin (not the Prisma /admin overview page).
 *
 * @param {Object} props
 * @param {string} props.restaurantId
 * @param {string} [props.restaurantName]
 * @param {string} [props.restaurantSlug]
 * @param {import("react").ReactNode} [props.qrSlot] Phase 4 QR generator mount point
 */
export default function AdminDashboard({
  restaurantId,
  restaurantName = "Restaurant",
  restaurantSlug = "",
  qrSlot = null,
}) {
  const { items, loading, error, refresh } = useLiveMenu(restaurantId);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState("");

  const publicPath = restaurantSlug || restaurantId;
  const publicMenuPath = publicPath ? `/menu/${publicPath}` : "";

  async function handleToggle(item) {
    setActionError("");
    setBusyId(item.id);
    try {
      await setQrMenuItemAvailability(item.id, !item.is_available);
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to update availability.");
    } finally {
      setBusyId("");
    }
  }

  async function handleDelete(item) {
    const confirmed = window.confirm(`Delete “${item.name}” from the live menu?`);
    if (!confirmed) return;

    setActionError("");
    setBusyId(item.id);
    try {
      await deleteQrMenuItem(item.id);
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to delete item.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-tap">
            QR menu admin
          </p>
          <h1 className="mt-2 font-display text-[28px] font-semibold tracking-[-0.02em]">
            {restaurantName}
          </h1>
          {publicMenuPath ? (
            <p className="mt-2 text-[14px] text-ink-muted">
              Guest link:{" "}
              <Link to={publicMenuPath} className="text-tap hover:text-tap-dark">
                {publicMenuPath}
              </Link>
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-xl bg-tap px-4 py-2.5 text-[13px] font-medium text-white hover:bg-tap-dark"
        >
          Add item
        </button>
      </div>

      {qrSlot ? <div className="mt-8">{qrSlot}</div> : null}

      {actionError ? (
        <p className="mt-6 text-[13px] text-brass-dark" role="alert">
          {actionError}
        </p>
      ) : null}

      <section className="mt-8 rounded-3xl border border-hairline bg-surface p-6 sm:p-8">
        <h2 className="font-display text-[20px] font-semibold">Menu items</h2>
        <p className="mt-1 text-[13px] text-ink-faint">
          Changes publish instantly to the guest QR menu.
        </p>

        {loading ? (
          <p className="mt-6 text-ink-muted" role="status">
            Loading items…
          </p>
        ) : error ? (
          <p className="mt-6 text-ink-muted" role="alert">
            {error}
          </p>
        ) : items.length === 0 ? (
          <p className="mt-6 text-ink-muted">No items yet. Add the first dish to get started.</p>
        ) : (
          <ul className="mt-6 divide-y divide-hairline">
            {items.map((item) => {
              const priceLabel = new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(Number(item.price) || 0);
              const busy = busyId === item.id;

              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-ink">{item.name}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          item.is_available
                            ? "bg-tap-soft text-tap-dark"
                            : "bg-brass-soft text-brass-dark"
                        }`}
                      >
                        {item.is_available ? "Available" : "Hidden"}
                      </span>
                    </div>
                    <p className="mt-1 text-[14px] text-ink-muted">
                      {priceLabel}
                      {item.calories != null ? ` · ${item.calories} kcal` : ""}
                    </p>
                    {item.description ? (
                      <p className="mt-1 text-[13px] text-ink-faint line-clamp-2">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleToggle(item)}
                      className="rounded-xl border border-hairline px-3 py-2 text-[13px] font-medium hover:border-hairline-strong disabled:opacity-60"
                    >
                      {item.is_available ? "Mark unavailable" : "Mark available"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleDelete(item)}
                      className="rounded-xl border border-hairline px-3 py-2 text-[13px] font-medium text-brass-dark hover:border-brass disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <AddMenuItemModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        restaurantId={restaurantId}
        onCreated={() => {
          void refresh();
        }}
      />
    </div>
  );
}
