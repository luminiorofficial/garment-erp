import type { Contact } from "@/components/common/contacts-panel";

/** Shape of a supplier as returned by /api/suppliers (timestamps arrive as ISO strings). */
export interface Supplier {
  id: string;
  code: string;
  name: string;
  billingAddress: string | null;
  shippingAddress: string | null;
  paymentTerms: string | null;
  leadTimeDays: number | null;
  rating: number | null;
  taxInformation: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SupplierContact = Contact;
