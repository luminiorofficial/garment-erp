import Link from "next/link";
import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { DASHBOARD_HREF } from "./nav-config";

/** CSS/icon logo mark: a rounded indigo tile with a layers glyph. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-[0.65rem] bg-linear-to-br from-brand to-brand-deep text-white shadow-[inset_0_1px_0_oklch(1_0_0/0.25),0_4px_10px_-2px_oklch(0.5_0.22_277/0.5)]",
        className
      )}
    >
      <Layers className="size-[1.15rem]" strokeWidth={2.25} />
    </span>
  );
}

export function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link
      href={DASHBOARD_HREF}
      aria-label="Garment ERP home"
      className="flex items-center gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring"
    >
      <BrandMark />
      {!collapsed && (
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-[0.95rem] font-semibold tracking-tight text-white">
            Garment ERP
          </span>
          <span className="truncate text-[0.7rem] text-sidebar-muted">Factory Control</span>
        </span>
      )}
    </Link>
  );
}
