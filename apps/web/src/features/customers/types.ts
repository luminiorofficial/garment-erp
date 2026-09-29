import type { Contact } from "@/components/common/contacts-panel";

/** Shape of a customer as returned by /api/customers (timestamps arrive as ISO strings). */
export interface Customer {
  id: string;
  code: string;
  name: string;
  billingAddress: string | null;
  shippingAddress: string | null;
  paymentTerms: string | null;
  taxInformation: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CustomerContact = Contact;
