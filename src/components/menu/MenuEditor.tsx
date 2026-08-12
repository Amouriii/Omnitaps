/**
 * TASK-4.2: On-demand menu editor for enterprise_admin users.
 */

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Save } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useRealtimeMenu } from "../../hooks/useRealtimeMenu";
import {
  createMenuItem,
  toggleMenuItemVisibility,
  updateMenuItemFields,
  updateMenuItemOrder,
} from "../../services/menuService";
import type { MenuItem, UserRole } from "../../types";

export interface MenuEditorProps {
  enterpriseId: string;
  className?: string;
}

interface DraftFields {
  label: string;
  url_path: string;
}

interface CreateFormState {
  label: string;
  url_path: string;
  icon_name: string;
  parent_id: string;
  required_roles: UserRole[];
}

const DEFAULT_ROLES: UserRole[] = [
  "super_admin",
  "enterprise_admin",
  "standard_user",
];

function emptyCreateForm(): CreateFormState {
  return {
    label: "",
    url_path: "/",
    icon_name: "",
    parent_id: "",
    required_roles: [...DEFAULT_ROLES],
  };
}

export function MenuEditor({ enterpriseId, className }: MenuEditorProps) {
  const { profile } = useAuth();
  const { menuItems, loading, error, refresh } = useRealtimeMenu(enterpriseId);
  const [drafts, setDrafts] = useState<Record<string, DraftFields>>({});
  const [createForm, setCreateForm] = useState<CreateFormState>(emptyCreateForm);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const sortedItems = useMemo(
    () => menuItems.slice().sort((a, b) => a.sort_order - b.sort_order),
    [menuItems],
  );

  if (profile?.role !== "enterprise_admin") {
    return (
      <div className={className} role="status">
        Menu editing is restricted to enterprise administrators.
      </div>
    );
  }

  const getDraft = (item: MenuItem): DraftFields =>
    drafts[item.id] ?? { label: item.label, url_path: item.url_path };

  const setDraftField = (
    itemId: string,
    field: keyof DraftFields,
    value: string,
    fallback: MenuItem,
  ) => {
    setDrafts((prev) => {
      const current = prev[itemId] ?? {
        label: fallback.label,
        url_path: fallback.url_path,
      };
      return {
        ...prev,
        [itemId]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  const runAction = async (id: string, action: () => Promise<void>) => {
    setBusyId(id);
    setActionError(null);
    try {
      await action();
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Menu update failed.");
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveItem = (item: MenuItem) => {
    const draft = getDraft(item);
    void runAction(item.id, async () => {
      await updateMenuItemFields(item.id, {
        label: draft.label.trim(),
        url_path: draft.url_path.trim(),
      });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    });
  };

  const handleToggleVisibility = (item: MenuItem) => {
    void runAction(item.id, async () => {
      await toggleMenuItemVisibility(item.id, !item.is_visible);
    });
  };

  const handleReorder = (item: MenuItem, direction: "up" | "down") => {
    const index = sortedItems.findIndex((entry) => entry.id === item.id);
    if (index < 0) return;

    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sortedItems.length) return;

    const current = sortedItems[index];
    const neighbor = sortedItems[swapIndex];

    void runAction(item.id, async () => {
      await updateMenuItemOrder([
        { id: current.id, sort_order: neighbor.sort_order },
        { id: neighbor.id, sort_order: current.sort_order },
      ]);
    });
  };

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const now = new Date().toISOString();

    void runAction("create", async () => {
      const nextOrder =
        sortedItems.length === 0
          ? 0
          : Math.max(...sortedItems.map((item) => item.sort_order)) + 1;

      await createMenuItem({
        enterprise_id: enterpriseId,
        parent_id: createForm.parent_id.trim() === "" ? null : createForm.parent_id.trim(),
        label: createForm.label.trim(),
        url_path: createForm.url_path.trim(),
        icon_name: createForm.icon_name.trim() === "" ? null : createForm.icon_name.trim(),
        sort_order: nextOrder,
        is_visible: true,
        required_roles: createForm.required_roles,
        created_at: now,
        updated_at: now,
      });

      setCreateForm(emptyCreateForm());
    });
  };

  if (loading) {
    return <div className={className}>Loading menu editor…</div>;
  }

  return (
    <section className={className} aria-label="Menu editor">
      {(error || actionError) && (
        <p role="alert" style={{ color: "#b42318" }}>
          {actionError ?? error}
        </p>
      )}

      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {sortedItems.map((item, index) => {
          const draft = getDraft(item);
          const disabled = busyId === item.id;

          return (
            <li
              key={item.id}
              style={{
                display: "grid",
                gap: "0.5rem",
                marginBottom: "0.75rem",
                paddingBottom: "0.75rem",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <input
                  aria-label={`Label for ${item.label}`}
                  value={draft.label}
                  disabled={disabled}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setDraftField(item.id, "label", event.target.value, item)
                  }
                />
                <input
                  aria-label={`URL path for ${item.label}`}
                  value={draft.url_path}
                  disabled={disabled}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setDraftField(item.id, "url_path", event.target.value, item)
                  }
                />
              </div>

              <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSaveItem(item)}
                  aria-label={`Save ${item.label}`}
                >
                  <Save size={14} /> Save
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => handleToggleVisibility(item)}
                  aria-label={`Toggle visibility for ${item.label}`}
                >
                  {item.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  {item.is_visible ? " Visible" : " Hidden"}
                </button>
                <button
                  type="button"
                  disabled={disabled || index === 0}
                  onClick={() => handleReorder(item, "up")}
                  aria-label={`Move ${item.label} up`}
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  disabled={disabled || index === sortedItems.length - 1}
                  onClick={() => handleReorder(item, "down")}
                  aria-label={`Move ${item.label} down`}
                >
                  <ArrowDown size={14} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <form onSubmit={handleCreate} style={{ display: "grid", gap: "0.5rem" }}>
        <h3 style={{ margin: 0 }}>Add menu item</h3>
        <input
          required
          placeholder="Label"
          value={createForm.label}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            setCreateForm((prev) => ({ ...prev, label: event.target.value }))
          }
        />
        <input
          required
          placeholder="URL path"
          value={createForm.url_path}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            setCreateForm((prev) => ({ ...prev, url_path: event.target.value }))
          }
        />
        <input
          placeholder="Icon name (lucide)"
          value={createForm.icon_name}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            setCreateForm((prev) => ({ ...prev, icon_name: event.target.value }))
          }
        />
        <input
          placeholder="Parent id (optional)"
          value={createForm.parent_id}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            setCreateForm((prev) => ({ ...prev, parent_id: event.target.value }))
          }
        />
        <button type="submit" disabled={busyId === "create"}>
          <Plus size={14} /> Create item
        </button>
      </form>
    </section>
  );
}
