/** Shape of a size as returned by /api/sizes. */
export interface Size {
  id: string;
  code: string;
  name: string;
  sequence: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
