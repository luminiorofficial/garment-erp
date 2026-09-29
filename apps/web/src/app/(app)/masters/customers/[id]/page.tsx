import type { Metadata } from "next";
import { CustomerDetailPage } from "@/features/customers/customer-detail";

export const metadata: Metadata = { title: "Customer" };

export default async function Page({ params }: PageProps<"/masters/customers/[id]">) {
  const { id } = await params;
  return <CustomerDetailPage id={id} />;
}
