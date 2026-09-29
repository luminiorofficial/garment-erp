"use client";

import { useState } from "react";
import { LogOut, User } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

export function UserMenu() {
  const { user, roles, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  if (!user) return null;

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
        className={cn(buttonVariants({ variant: "ghost" }), "gap-2")}
      >
        <User aria-hidden />
        <span className="hidden max-w-40 truncate sm:inline">
          {user.firstName} {user.lastName}
        </span>
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
