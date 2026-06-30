import { useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, LogOut, Plane, LayoutDashboard, Languages } from "lucide-react";
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter } from "@/components/ui/sidebar";
import { MENU_GROUPS, type MenuNode, type MenuGroup } from "@/lib/menu";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { canSeeGroup, canSeeMenuNode } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { loadForms } from "@/lib/forms-store";

// Map sidebar menu keys -> dynamic form ids (so admin renames propagate to nav)
const FORM_KEY_TO_ID: Record<string, string> = {
  ahm_650: "ahm-650",
  dg_incident: "dg-incident",
  ios_428_01_checklist: "ios-428-01",
};

function resolveLabel(t: (k: string) => string, key: string): string {
  const formId = FORM_KEY_TO_ID[key];
  if (formId) {
    const f = loadForms().find((x) => x.id === formId);
    if (f) return f.label;
  }
  return t(key);
}

function isHiddenFormKey(key: string): boolean {
  const formId = FORM_KEY_TO_ID[key];
  if (!formId) return false;
  return loadForms().find((f) => f.id === formId)?.hidden ?? false;
}

function hasActiveDescendant(node: MenuNode, pathname: string): boolean {
  if (node.to && node.to === pathname) return true;
  return !!node.children?.some((c) => hasActiveDescendant(c, pathname));
}

function NavItem({ node, depth, pathname }: { node: MenuNode; depth: number; pathname: string }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const active = node.to === pathname;
  const childActive = node.children && hasActiveDescendant(node, pathname);
  const [open, setOpen] = useState(!!childActive);
  if (!canSeeMenuNode(node, user)) return null;
  if (isHiddenFormKey(node.key)) return null;
  const visibleChildren = node.children?.filter((c) => canSeeMenuNode(c, user) && !isHiddenFormKey(c.key)) ?? [];

  if (node.children?.length) {
    if (visibleChildren.length === 0) return null;
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
            "text-slate-200 hover:bg-slate-800/60 hover:text-white",
            childActive && "text-white",
          )}
          style={{ paddingLeft: 12 + depth * 12 }}
        >
          <span className="truncate">{resolveLabel(t, node.key)}</span>
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          )}
        </button>
        {open && (
          <div className="mt-0.5 space-y-0.5">
            {visibleChildren.map((c) => (
              <NavItem key={c.key} node={c} depth={depth + 1} pathname={pathname} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      to={node.to!}
      className={cn(
        "flex cursor-pointer items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-blue-600 text-white shadow-sm"
          : "text-slate-300 hover:bg-slate-800/60 hover:text-white",
      )}
      style={{ paddingLeft: 12 + depth * 12 }}
    >
      <span className="truncate">{resolveLabel(t, node.key)}</span>
    </Link>
  );
}

export function AppSidebar() {
  const { t, lang, setLang } = useI18n();
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  // Visibility per user type / granted modules
  const isAdmin = user?.role === "admin";
  const groups: MenuGroup[] = MENU_GROUPS.filter((g) => canSeeGroup(g.key, user));

  const initial = (user?.username ?? "U").slice(0, 1).toUpperCase();

  return (
    <Sidebar collapsible="icon" className="border-r border-slate-800 bg-slate-900 text-slate-100">
      <SidebarHeader className="border-b border-slate-800 bg-slate-900 px-4 py-4">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white shadow-md">
            <Plane className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-base font-bold text-white">Tunisair</div>
            <div className="truncate text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Ground Ops · EDMS
            </div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="bg-slate-900 px-3 py-3">
        <nav className="space-y-5">
          {groups.map((group) => {
            const Icon = group.icon ?? LayoutDashboard;
            const isDashboard = group.key === "dashboard";
            return (
              <div key={group.key} className="space-y-1">
                {group.label && (
                  <div className="flex items-center gap-2 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-400">
                    <Icon className="h-3.5 w-3.5" />
                    <span>{t(group.label)}</span>
                  </div>
                )}
                <div className="space-y-0.5">
                  {group.items.filter((node) => canSeeMenuNode(node, user)).map((node) =>
                    isDashboard ? (
                      <Link
                        key={node.key}
                        to={node.to!}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors",
                          pathname === node.to
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-slate-200 hover:bg-slate-800/60 hover:text-white",
                        )}
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        <span>{t(node.key)}</span>
                      </Link>
                    ) : (
                      <NavItem key={node.key} node={node} depth={0} pathname={pathname} />
                    ),
                  )}
                </div>
              </div>
            );
          })}
        </nav>
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-800 bg-slate-900 p-3">
        <div className="mb-2 flex items-center gap-1 rounded-md bg-slate-800/60 p-1">
          <Languages className="ml-1 h-3.5 w-3.5 text-slate-400" />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setLang("fr")}
            className={cn(
              "h-6 flex-1 cursor-pointer text-[11px]",
              lang === "fr"
                ? "bg-blue-600 text-white hover:bg-blue-600"
                : "text-slate-300 hover:bg-slate-700 hover:text-white",
            )}
          >
            FR
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setLang("en")}
            className={cn(
              "h-6 flex-1 cursor-pointer text-[11px]",
              lang === "en"
                ? "bg-blue-600 text-white hover:bg-blue-600"
                : "text-slate-300 hover:bg-slate-700 hover:text-white",
            )}
          >
            EN
          </Button>
        </div>
        <div className="flex items-center gap-3 rounded-md bg-slate-800/40 px-2 py-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 truncate text-sm font-semibold text-white">
              {user?.username ?? "—"} {isAdmin && <span className="text-yellow-400">★</span>}
            </div>
            <div className="truncate text-[11px] capitalize text-slate-400">{user?.role ?? ""}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { logout(); nav({ to: "/login" }); }}
          className="mt-2 flex w-full cursor-pointer items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          {t("logout")}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
