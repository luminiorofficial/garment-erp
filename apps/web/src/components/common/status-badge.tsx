import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(isActive ? "text-success" : "text-muted-foreground")}
    >
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", isActive ? "bg-success" : "bg-muted-foreground")}
      />
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );
}
