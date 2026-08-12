import { SignInButtons } from "@/components/auth/SignInButtons";

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-8 py-24 text-center">
      <p className="mb-4 text-xs uppercase tracking-[0.18em] text-ink-muted">
        A quiet ledger of days
      </p>

      <h1 className="mb-4 font-heading text-5xl font-semibold tracking-tight">
        Baby Steps
      </h1>

      <p className="mb-10 text-balance leading-relaxed text-ink-muted">
        Mark the days as they pass. Watch the shape of your attention
        emerge, one small step at a time.
      </p>

      <SignInButtons />
    </main>
  );
}
