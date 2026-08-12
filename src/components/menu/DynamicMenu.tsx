/**
 * TASK-4.1: Hierarchical navigation renderer driven by realtime menu state.
 */

import { Boxes, Globe, LayoutDashboard, Menu, type LucideIcon } from "lucide-react";
import { useRealtimeMenu } from "../../hooks/useRealtimeMenu";
import type { MenuItem, UserRole } from "../../types";

export interface DynamicMenuProps {
  enterpriseId: string;
  role: UserRole;
  className?: string;
}

interface MenuTreeNode extends MenuItem {
  children: MenuTreeNode[];
}

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Menu,
  Boxes,
  Globe,
};

function resolveIcon(iconName: string | null): LucideIcon | null {
  if (!iconName) {
    return null;
  }
  return ICON_MAP[iconName] ?? null;
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
    <ul className="m-0 list-none space-y-1 p-0">
      {nodes.map((node) => {
        const Icon = resolveIcon(node.icon_name);
        return (
          <li key={node.id}>
            <a
              href={node.url_path}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[14px] font-medium text-ink-muted transition-colors hover:bg-porcelain hover:text-ink"
            >
              {Icon ? <Icon size={16} className="text-tap" aria-hidden="true" /> : null}
              <span>{node.label}</span>
            </a>
            {node.children.length > 0 ? (
              <div className="ml-3 border-l border-hairline pl-2">
                <MenuBranch nodes={node.children} />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function DynamicMenu({ enterpriseId, role, className }: DynamicMenuProps) {
  const { menuItems, loading, error } = useRealtimeMenu(enterpriseId);
  const tree = buildMenuTree(menuItems, role);

  if (loading) {
    return (
      <nav className={className} aria-busy="true">
        <div className="space-y-2" role="status">
          <div className="h-9 animate-pulse rounded-xl bg-porcelain" />
          <div className="h-9 animate-pulse rounded-xl bg-porcelain" />
          <div className="h-9 animate-pulse rounded-xl bg-porcelain" />
        </div>
      </nav>
    );
  }

  if (error) {
    return (
      <nav className={className} role="alert">
        <p className="rounded-xl bg-brass-soft px-3 py-2 text-[13px] text-brass-dark">
          Couldn’t load shortcuts.
        </p>
      </nav>
    );
  }

  if (tree.length === 0) {
    return (
      <nav className={className}>
        <p className="rounded-xl bg-porcelain px-3 py-2 text-[13px] text-ink-muted">
          No shortcuts yet. Add them in the menu editor.
        </p>
      </nav>
    );
  }

  return (
    <nav className={className} aria-label="Shortcuts">
      <MenuBranch nodes={tree} />
    </nav>
  );
}
