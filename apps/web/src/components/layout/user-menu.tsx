"use client";

import { useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/providers/auth-provider";

export function UserMenu() {
  const { user, roles, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  if (!user) return null;

  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout(); // AuthGate redirects to /login once the session is cleared.
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 outline-none transition-colors duration-150 hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring aria-expanded:bg-accent"
      >
        <span
          aria-hidden
          className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-deep ring-1 ring-brand/15 dark:text-foreground"
        >
          {initials}
        </span>
        <span className="hidden text-left leading-tight md:block">
          <span className="block max-w-36 truncate text-[0.8rem] font-medium">
            {user.firstName} {user.lastName}
          </span>
          <span className="block max-w-36 truncate text-[0.7rem] text-muted-foreground">
            {roles[0] ?? "No role"}
          </span>
        </span>
        <ChevronDown aria-hidden className="hidden size-3.5 text-muted-foreground md:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-1.5 text-sm">
          <p className="font-medium">
            {user.firstName} {user.lastName}
          </p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {roles.length > 0 ? roles.join(", ") : "No roles assigned"}
          </p>
        </div>
        <DropdownMenuItem disabled={isLoggingOut} onClick={handleLogout}>
          <LogOut aria-hidden />
          {isLoggingOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
