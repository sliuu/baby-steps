import { notFound } from "next/navigation";

import { TourPreview } from "./TourPreview";

/** The first-run tour on an empty account, in memory. Dev only. */
export default function TourPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <TourPreview />;
}
