import type { Metadata } from "next";
import { SupplierDetailPage } from "@/features/suppliers/supplier-detail";

export const metadata: Metadata = { title: "Supplier" };

export default async function Page({ params }: PageProps<"/masters/suppliers/[id]">) {
  const { id } = await params;
  return <SupplierDetailPage id={id} />;
}
