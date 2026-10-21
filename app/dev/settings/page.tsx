import { notFound } from "next/navigation";

import { SettingsPreview } from "./SettingsPreview";

/** The settings dialog without signing in. Dev only. */
export default function SettingsPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <SettingsPreview />;
}
