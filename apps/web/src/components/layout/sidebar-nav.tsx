"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
import { DASHBOARD_HREF, visibleNavGroups } from "./nav-config";

const itemClass =
  "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { permissions } = useAuth();
  const groups = visibleNavGroups(permissions);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav aria-label="Main" className="flex flex-col gap-4">
      <Link
        href={DASHBOARD_HREF}
        onClick={onNavigate}
        aria-current={isActive(DASHBOARD_HREF) ? "page" : undefined}
        className={cn(
          itemClass,
          isActive(DASHBOARD_HREF)
            ? "bg-sidebar-accent font-medium"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent"
        )}
      >
        <LayoutDashboard aria-hidden className="size-4" />
        Dashboard
      </Link>

      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-0.5">
          <p className="px-2.5 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {group.label}
          </p>
          {group.items.map((item) =>
            item.comingSoon ? (
              <span
                key={item.href}
                aria-disabled="true"
                className={cn(itemClass, "cursor-not-allowed justify-between text-muted-foreground/70")}
              >
                {item.label}
                <span className="rounded border px-1 text-[10px] uppercase">Soon</span>
              </span>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  itemClass,
                  isActive(item.href)
                    ? "bg-sidebar-accent font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent"
                )}
              >
                {item.label}
              </Link>
            )
          )}
        </div>
      ))}
    </nav>
  );
}
