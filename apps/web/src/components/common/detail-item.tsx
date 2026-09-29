/** Label/value pair for read-only detail views. Blank values render as an em dash. */
export function DetailItem({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  const isBlank = children === null || children === undefined || children === "";
  return (
    <div className={className}>
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-1 text-sm whitespace-pre-line">
        {isBlank ? <span className="text-muted-foreground">—</span> : children}
      </dd>
    </div>
  );
}

export function DetailGrid({ children }: { children: React.ReactNode }) {
  return <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>;
}
