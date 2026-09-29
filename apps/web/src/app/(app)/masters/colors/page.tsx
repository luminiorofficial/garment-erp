import type { Metadata } from "next";
import { ColorsPage } from "@/features/colors/colors-page";

export const metadata: Metadata = { title: "Colors" };

export default function Page() {
  return <ColorsPage />;
}
