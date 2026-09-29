import { cn } from "@/lib/utils";

/** Semantic status pill: soft tinted surface, dot + label (never color alone). */
export function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-5.5 items-center gap-1.5 rounded-full px-2 text-xs font-medium ring-1 ring-inset",
        isActive
          ? "bg-success-soft text-success ring-success/20"
          : "bg-muted text-muted-foreground ring-foreground/10"
      )}
    >
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", isActive ? "bg-success" : "bg-muted-foreground/60")}
      />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}
