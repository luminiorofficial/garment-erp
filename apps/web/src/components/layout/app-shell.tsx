"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Brand } from "./brand";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";
import { breadcrumbsFor } from "./nav-config";
import { useSidebarCollapsed } from "./use-sidebar-collapsed";

function Breadcrumbs() {
  const pathname = usePathname();
  const crumbs = breadcrumbsFor(pathname);

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex items-center gap-1 truncate text-[0.82rem] text-muted-foreground">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
              {index > 0 && <ChevronRight aria-hidden className="size-3.5 opacity-50" />}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="rounded px-1 transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={cn("px-1", isLast && "font-medium text-foreground")}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useSidebarCollapsed();

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out md:flex",
          collapsed ? "w-[4.5rem]" : "w-[16.25rem]"
        )}
      >
        <div className={cn("flex h-16 items-center", collapsed ? "justify-center" : "px-5")}>
          <Brand collapsed={collapsed} />
        </div>
        <div className={cn("flex-1 overflow-y-auto py-3", collapsed ? "px-3" : "px-4")}>
          <SidebarNav collapsed={collapsed} />
        </div>
        <div className={cn("border-t border-sidebar-border p-3", collapsed && "flex justify-center")}>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={() => setCollapsed(!collapsed)}
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-[0.8rem] text-sidebar-muted outline-none transition-colors duration-150 hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-ring",
                    !collapsed && "w-full"
                  )}
                />
              }
            >
              {collapsed ? (
                <PanelLeftOpen aria-hidden className="size-[1.1rem]" />
              ) : (
                <>
                  <PanelLeftClose aria-hidden className="size-[1.1rem]" />
                  Collapse
                </>
              )}
            </TooltipTrigger>
            <TooltipContent side="right">
              {collapsed ? "Expand sidebar" : "Collapse sidebar"}
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-72 gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground [&_[data-slot=sheet-close]]:text-white"
        >
          <SheetTitle className="sr-only">Garment ERP navigation</SheetTitle>
          <SheetDescription className="sr-only">Main navigation</SheetDescription>
          <div className="flex h-16 items-center px-5">
            <Brand />
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-md sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
          >
            <Menu />
          </Button>
          <Breadcrumbs />
          <div className="ml-auto flex items-center gap-2">
            <UserMenu />
          </div>
        </header>
        <main className="canvas-glow flex-1 px-3 py-5 sm:px-6 sm:py-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
