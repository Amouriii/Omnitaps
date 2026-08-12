/**
 * TASK-4.1: Hierarchical navigation renderer driven by realtime menu state.
 */

import type { LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useRealtimeMenu } from "../../hooks/useRealtimeMenu";
import type { MenuItem, UserRole } from "../../types";

export interface DynamicMenuProps {
  enterpriseId: string;
  className?: string;
}

interface MenuTreeNode extends MenuItem {
  children: MenuTreeNode[];
}

function resolveIcon(iconName: string | null): LucideIcon | null {
  if (!iconName) {
    return null;
  }

  const icons = LucideIcons as unknown as Record<string, LucideIcon>;
  const candidate = icons[iconName];
  return typeof candidate === "function" ? candidate : null;
}

function roleAllowed(item: MenuItem, role: UserRole | null): boolean {
  if (!role) {
    return false;
  }
  if (!item.is_visible) {
    return false;
  }
  return item.required_roles.includes(role);
}

function buildMenuTree(items: MenuItem[], role: UserRole | null): MenuTreeNode[] {
  const visible = items.filter((item) => roleAllowed(item, role));
  const byId = new Map<string, MenuTreeNode>();

  for (const item of visible) {
    byId.set(item.id, { ...item, children: [] });
  }

  const roots: MenuTreeNode[] = [];

  for (const node of byId.values()) {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRecursive = (nodes: MenuTreeNode[]): MenuTreeNode[] =>
    nodes
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((node) => ({
        ...node,
        children: sortRecursive(node.children),
      }));

  return sortRecursive(roots);
}

function MenuBranch({ nodes }: { nodes: MenuTreeNode[] }) {
  if (nodes.length === 0) {
    return null;
  }

  return (
    <ul style={{ listStyle: "none", margin: 0, paddingLeft: "1rem" }}>
      {nodes.map((node) => {
        const Icon = resolveIcon(node.icon_name);
        return (
          <li key={node.id} style={{ marginBottom: "0.35rem" }}>
            <a
              href={node.url_path}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              {Icon ? <Icon size={16} aria-hidden="true" /> : null}
              <span>{node.label}</span>
            </a>
            <MenuBranch nodes={node.children} />
          </li>
        );
      })}
    </ul>
  );
}

export function DynamicMenu({ enterpriseId, className }: DynamicMenuProps) {
  const { profile } = useAuth();
  const { menuItems, loading, error } = useRealtimeMenu(enterpriseId);
  const tree = buildMenuTree(menuItems, profile?.role ?? null);

  if (loading) {
    return <nav className={className} aria-busy="true">Loading menu…</nav>;
  }

  if (error) {
    return (
      <nav className={className} role="alert">
        Unable to load menu: {error}
      </nav>
    );
  }

  if (tree.length === 0) {
    return <nav className={className}>No menu items available.</nav>;
  }

  return (
    <nav className={className} aria-label="Enterprise menu">
      <MenuBranch nodes={tree} />
    </nav>
  );
}
