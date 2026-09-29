import type { ListParams } from "@/lib/types";

/** Shape of a style as returned by /api/styles (list rows have no size/color ids). */
export interface Style {
  id: string;
  code: string;
  name: string;
  productId: string;
  customerId: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A style with the ids of its allowed sizes and colors (detail/create/update responses). */
export interface StyleDetail extends Style {
  sizeIds: string[];
  colorIds: string[];
}

/** Immutable snapshot of a style definition. Not an approval; no BOM/sample data. */
export interface StyleVersion {
  id: string;
  styleId: string;
  versionNumber: number;
  specification: string | null;
  changeSummary: string | null;
  createdAt: string;
  createdBy: string | null;
}

export interface StyleListParams extends ListParams {
  productId?: string;
  customerId?: string;
}

export function versionLabel(versionNumber: number) {
  return `V${versionNumber}`;
}
