import { Suspense } from "react";
import type { Metadata } from "next";
import { StylesPage } from "@/features/styles/styles-page";

export const metadata: Metadata = { title: "Styles" };

export default function Page() {
  // The list reads ?productId= from the URL, which needs a Suspense boundary.
  return (
    <Suspense>
      <StylesPage />
    </Suspense>
  );
}
