"use client";

import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface RowAction {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
  /** Falsy actions are omitted, so callers can write `canEdit && {…}`. */
}

export function RowActions({
  label,
  actions,
}: {
  /** Accessible name, e.g. "Actions for ACME-01". */
  label: string;
  actions: Array<RowAction | false | null | undefined>;
}) {
  const visible = actions.filter((a): a is RowAction => Boolean(a));
  if (visible.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {visible.map((action) => (
          <DropdownMenuItem
            key={action.label}
            variant={action.destructive ? "destructive" : "default"}
            onClick={action.onSelect}
          >
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
