/** Display-only swatch for a color's hex value; renders nothing without one. */
export function ColorSwatch({ hex }: { hex: string | null }) {
  if (!hex) return null;
  return (
    <span
      aria-hidden
      className="inline-block size-3.5 shrink-0 rounded-sm border"
      style={{ backgroundColor: hex }}
    />
  );
}
