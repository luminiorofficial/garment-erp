/** Shape of a color as returned by /api/colors. `hexValue` is a display swatch only. */
export interface Color {
  id: string;
  code: string;
  name: string;
  reference: string | null;
  hexValue: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
