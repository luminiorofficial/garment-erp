import { PermissionCode } from "@garment-erp/shared";
import { usePermission } from "@/hooks/use-permission";
import { labelFor, referenceOptions } from "@/lib/reference-options";
import { useColorLookup } from "@/features/colors/queries";
import type { Color } from "@/features/colors/types";
import { useCustomerLookup } from "@/features/customers/queries";
import type { Customer } from "@/features/customers/types";
import { useProductLookup } from "@/features/products/queries";
import type { Product } from "@/features/products/types";
import { useSizeLookup } from "@/features/sizes/queries";
import type { Size } from "@/features/sizes/types";

export const productLabel = (p: Product) => `${p.code} — ${p.name}`;
export const customerLabel = (c: Customer) => `${c.code} — ${c.name}`;
export const sizeLabel = (s: Size) => `${s.code} — ${s.name}`;
export const colorLabel = (c: Color) => `${c.code} — ${c.name}`;

/**
 * Product, Customer, Size and Color masters as seen from Styles. Each lookup
 * only runs if the user may view that master; otherwise ids cannot be resolved
 * to names and the matching form control is read-only.
 */
export function useStyleReferences() {
  const canViewProducts = usePermission(PermissionCode.PRODUCTS_VIEW);
  const canViewCustomers = usePermission(PermissionCode.CUSTOMERS_VIEW);
  const canViewSizes = usePermission(PermissionCode.SIZES_VIEW);
  const canViewColors = usePermission(PermissionCode.COLORS_VIEW);

  const products = useProductLookup(canViewProducts);
  const customers = useCustomerLookup(canViewCustomers);
  const sizes = useSizeLookup(canViewSizes);
  const colors = useColorLookup(canViewColors);

  return {
    canViewProducts,
    canViewCustomers,
    canViewSizes,
    canViewColors,
    products,
    customers,
    sizes,
    colors,
    productOptions: (currentId?: string | null) =>
      referenceOptions(products.data, currentId, productLabel),
    customerOptions: (currentId?: string | null) =>
      referenceOptions(customers.data, currentId, customerLabel),
    sizeOptions: (currentIds: readonly string[]) =>
      referenceOptions(sizes.data, currentIds, sizeLabel),
    colorOptions: (currentIds: readonly string[]) =>
      referenceOptions(colors.data, currentIds, colorLabel),
    productName: (id: string | null) => labelFor(products.data, id, productLabel),
    customerName: (id: string | null) => labelFor(customers.data, id, customerLabel),
  };
}
