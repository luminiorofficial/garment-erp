import type { Metadata } from "next";
import { JobWorkerDetailPage } from "@/features/job-workers/job-worker-detail";

export const metadata: Metadata = { title: "Job Worker" };

export default async function Page({ params }: PageProps<"/masters/job-workers/[id]">) {
  const { id } = await params;
  return <JobWorkerDetailPage id={id} />;
}
