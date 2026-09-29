import type { Metadata } from "next";
import { UnitsPage } from "@/features/units/units-page";

export const metadata: Metadata = { title: "Units" };

export default function Page() {
  return <UnitsPage />;
}
