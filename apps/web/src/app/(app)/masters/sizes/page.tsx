import type { Metadata } from "next";
import { SizesPage } from "@/features/sizes/sizes-page";

export const metadata: Metadata = { title: "Sizes" };

export default function Page() {
  return <SizesPage />;
}
