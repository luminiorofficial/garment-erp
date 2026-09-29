"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, type LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
import { DASHBOARD_HREF, visibleNavGroups } from "./nav-config";

const itemBase =
  "group/nav relative flex items-center gap-3 rounded-lg px-3 py-2 text-[0.85rem] outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring";

function NavIcon({ icon: Icon, active }: { icon: LucideIcon; active?: boolean }) {
  return (
    <Icon
      aria-hidden
      className={cn(
        "size-[1.1rem] shrink-0 transition-colors duration-150",
        active ? "text-sidebar-active-icon" : "text-sidebar-muted group-hover/nav:text-sidebar-foreground"
      )}
      strokeWidth={active ? 2.25 : 1.85}
    />
  );
}

function NavLink({
  href,
  label,
  icon,
  active,
  collapsed,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const link = (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
      className={cn(
        itemBase,
        collapsed && "justify-center px-0",
        active
          ? "bg-sidebar-accent font-medium text-white shadow-[inset_0_0_0_1px_oklch(1_0_0/0.06)]"
          : "text-sidebar-foreground/80 hover:bg-white/5 hover:text-white"
      )}
    >
      {active && (
        <span
          aria-hidden
          className="absolute top-2 bottom-2 -left-3 w-[3px] rounded-r-full bg-sidebar-active-icon"
        />
      )}
      <NavIcon icon={icon} active={active} />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export function SidebarNav({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { permissions } = useAuth();
  const groups = visibleNavGroups(permissions);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav aria-label="Main" className="flex flex-col gap-6">
      <NavLink
        href={DASHBOARD_HREF}
        label="Dashboard"
        icon={LayoutDashboard}
        active={isActive(DASHBOARD_HREF)}
        collapsed={collapsed}
        onNavigate={onNavigate}
      />

      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-0.5">
          {collapsed ? (
            <div aria-hidden className="mx-3 mb-2 h-px bg-sidebar-border" />
          ) : (
            <p className="px-3 pb-1.5 text-[0.7rem] font-medium tracking-[0.06em] text-sidebar-muted">
              {group.label}
            </p>
          )}
          {group.items.map((item) =>
            item.comingSoon ? (
              <span
                key={item.href}
                aria-disabled="true"
                title={collapsed ? `${item.label} (coming soon)` : undefined}
                className={cn(
                  itemBase,
                  "cursor-not-allowed text-sidebar-muted/70",
                  collapsed ? "justify-center px-0" : "justify-between"
                )}
              >
                <span className="flex items-center gap-3">
                  <NavIcon icon={item.icon} />
                  {!collapsed && item.label}
                </span>
                {!collapsed && (
                  <span className="rounded-full border border-sidebar-border px-1.5 text-[0.6rem] tracking-wide uppercase">
                    Soon
                  </span>
                )}
              </span>
            ) : (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isActive(item.href)}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            )
          )}
        </div>
      ))}
    </nav>
  );
}
