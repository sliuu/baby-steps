/**
 * Temporary. Each view replaces it with the real thing in a later step.
 * No "use client" here, and none needed — this is rendered on the server and
 * passed into AppShell as already-finished output.
 */
export function Placeholder({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <section className="rounded-xl border border-dashed border-hairline bg-surface px-10 py-20 text-center">
      <p className="eyebrow oldstyle">{eyebrow}</p>
      <h1 className="mt-4 text-section-title">{title}</h1>
      <p className="mx-auto mt-4 max-w-sm leading-relaxed text-ink-muted">
        {body}
      </p>
    </section>
  );
}
