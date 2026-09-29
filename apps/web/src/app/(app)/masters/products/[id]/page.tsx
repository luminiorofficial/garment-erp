import type { Metadata } from "next";
import { ProductDetailPage } from "@/features/products/product-detail";

export const metadata: Metadata = { title: "Product" };

export default async function Page({ params }: PageProps<"/masters/products/[id]">) {
  const { id } = await params;
  return <ProductDetailPage id={id} />;
}
