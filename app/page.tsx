import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

const AREAS = [
  { name: "Spirituality", swatch: "bg-area-spirituality", hex: "#C4483C" },
  { name: "Exercise", swatch: "bg-area-exercise", hex: "#3178B5" },
  { name: "Work", swatch: "bg-area-work", hex: "#D9762B" },
  { name: "Creativity & Play", swatch: "bg-area-creativity", hex: "#DDB63C" },
  { name: "Romance & Adventure", swatch: "bg-area-romance", hex: "#4C8B4A" },
  { name: "Friends & Family", swatch: "bg-area-friends", hex: "#9457C0" },
];

const MOODS = [
  { name: "Great", swatch: "bg-mood-great" },
  { name: "Good", swatch: "bg-mood-good" },
  { name: "Okay", swatch: "bg-mood-okay" },
  { name: "Low", swatch: "bg-mood-low" },
  { name: "Rough", swatch: "bg-mood-rough" },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.7rem] uppercase tracking-[0.18em] text-ink-muted">
      {children}
    </p>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-hairline pt-10">
      <h2 className="mb-6 text-2xl font-medium">{title}</h2>
      {children}
    </section>
  );
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-8 py-16">
      <header className="mb-16 flex items-start justify-between gap-8">
        <div>
          <Eyebrow>Step one · Foundation</Eyebrow>
          <h1 className="mt-3 text-6xl font-semibold tracking-tight">
            Baby Steps
          </h1>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-ink-muted">
            Nothing works yet. This page exists to prove the ground is level:
            the type, the palette, and both themes.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <div className="space-y-14">
        <Section title="Life areas">
          <ul className="grid grid-cols-2 gap-x-8 gap-y-4">
            {AREAS.map((area) => (
              <li key={area.name} className="flex items-center gap-3">
                <span
                  className={`size-7 shrink-0 rounded-full ${area.swatch}`}
                  aria-hidden
                />
                <span className="flex-1">{area.name}</span>
                <span className="tabular text-sm text-ink-muted">
                  {area.hex}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-8 mb-3 text-sm text-ink-muted">
            Moods reuse the same five hues.
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {MOODS.map((mood) => (
              <li key={mood.name} className="flex items-center gap-2">
                <span
                  className={`size-3.5 rounded-full ${mood.swatch}`}
                  aria-hidden
                />
                <span className="text-sm">{mood.name}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Type">
          <div className="space-y-5">
            <p className="font-heading text-5xl">July 2026</p>
            <p className="max-w-prose leading-relaxed">
              Place a sticker on each day. Over a month, the small marks gather
              into the shape of where your attention truly went.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-8 border-t border-hairline pt-6">
            <div>
              <Eyebrow>Oldstyle · prose and dates</Eyebrow>
              <p className="oldstyle mt-2 text-3xl">1 4 7 13 28 2026</p>
            </div>
            <div>
              <Eyebrow>Tabular · tables and counts</Eyebrow>
              <p className="tabular mt-2 text-3xl">1 4 7 13 28 2026</p>
            </div>
          </div>
        </Section>

        <Section title="One shadcn Button, twice">
          <p className="mb-8 max-w-prose text-ink-muted">
            The same component. On the left, as the CLI delivered it. On the
            right, after our tokens reached it — with no edit to{" "}
            <code className="rounded bg-secondary px-1.5 py-0.5 text-[0.85em]">
              button.tsx
            </code>
            .
          </p>

          <div className="flex items-center gap-10">
            <div>
              <Eyebrow>Before</Eyebrow>
              {/* Stock values hardcoded inline, so our variables cannot reach it. */}
              <div className="mt-3">
                <button
                  type="button"
                  style={{
                    fontFamily:
                      'ui-sans-serif, system-ui, "Segoe UI", sans-serif',
                    backgroundColor: "oklch(0.205 0 0)",
                    color: "oklch(0.985 0 0)",
                    borderRadius: "0.625rem",
                    height: "2rem",
                    padding: "0 0.625rem",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                  }}
                >
                  Continue with Google
                </button>
              </div>
            </div>

            <div>
              <Eyebrow>After</Eyebrow>
              <div className="mt-3">
                <Button>Continue with Google</Button>
              </div>
            </div>
          </div>
        </Section>
      </div>
    </main>
  );
}
