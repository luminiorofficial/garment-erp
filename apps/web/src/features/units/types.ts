/** Shape of a unit as returned by /api/units (timestamps arrive as ISO strings). */
export interface Unit {
  id: string;
  code: string;
  name: string;
  symbol: string | null;
  decimalPlaces: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
