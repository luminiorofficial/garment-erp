import type { Metadata } from "next";
import { ProcessesPage } from "@/features/processes/processes-page";

export const metadata: Metadata = { title: "Processes" };

export default function Page() {
  return <ProcessesPage />;
}
