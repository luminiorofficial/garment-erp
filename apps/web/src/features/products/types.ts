/** Shape of a product as returned by /api/products. */
export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
