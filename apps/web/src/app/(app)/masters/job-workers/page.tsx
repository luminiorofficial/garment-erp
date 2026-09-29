import type { Metadata } from "next";
import { JobWorkersPage } from "@/features/job-workers/job-workers-page";

export const metadata: Metadata = { title: "Job Workers" };

export default function Page() {
  return <JobWorkersPage />;
}
