import type { Metadata } from "next";
import { StyleDetailPage } from "@/features/styles/style-detail";

export const metadata: Metadata = { title: "Style" };

export default async function Page({ params }: PageProps<"/masters/styles/[id]">) {
  const { id } = await params;
  return <StyleDetailPage id={id} />;
}
