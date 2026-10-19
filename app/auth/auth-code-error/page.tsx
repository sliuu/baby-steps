import Link from "next/link";

import { Button } from "@/components/ui/button";
import { NoticePage } from "@/components/ui/NoticePage";

export default async function AuthCodeError({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  return (
    <NoticePage
      eyebrow="something went sideways"
      title="we couldn’t sign you in"
      action={
        <Button asChild variant="filled" size="md">
          <Link href="/login">try again</Link>
        </Button>
      }
    >
      {reason ?? "the sign-in link expired or was already used."}
    </NoticePage>
  );
}
