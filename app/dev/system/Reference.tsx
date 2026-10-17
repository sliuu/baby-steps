"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

import { Flower } from "@/components/balance/Flower";
import { LifePie } from "@/components/balance/LifePie";
import type { BalanceCategory } from "@/components/balance/shared";
import { MoodRow } from "@/components/calendar/MoodRow";
import { StickerMark, type StickerSize } from "@/components/calendar/StickerMark";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/Chip";
import { MoodDot, MoodFace } from "@/components/ui/Mood";
import { PageFrame } from "@/components/ui/PageFrame";
import type { Balance, Level } from "@/lib/balance";
import { today } from "@/lib/dates";
import { PANEL } from "@/lib/layout";
import { MOODS, type Mood } from "@/lib/moods";
import { CATEGORY_COLORS, categoryColor, type CategoryColor } from "@/lib/palette";

const SURFACES = ["frame", "on-frame", "paper", "raised", "ink", "ink-muted", "ink-subtle", "accent-ink"];
const RULES = ["rule-strong", "rule", "rule-grid", "rule-input"];

const CATEGORIES: BalanceCategory[] = [
  { id: "spirituality", name: "spirituality", colorKey: "oxblood" },
  { id: "exercise", name: "exercise", colorKey: "bottle" },
  { id: "work", name: "work", colorKey: "mustard" },
  { id: "creativity", name: "creativity & play", colorKey: "rose" },
  { id: "romance", name: "romance & adventure", colorKey: "sage" },
  { id: "friends", name: "friends & family", colorKey: "plum" },
];

const MARKS: Record<CategoryColor, string> = {
  oxblood: "icon:sparkles",
  bottle: "icon:dumbbell",
  mustard: "icon:inbox",
  rose: "🎨",
  sage: "icon:footprints",
  plum: "icon:brain",
};

const STICKER_SIZES: StickerSize[] = ["lg", "md", "sm", "xs"];

// Literal classes so Tailwind generates them.
const TYPE: { token: string; className: string }[] = [
  { token: "display-xl", className: "font-display text-display-xl font-light" },
  { token: "display", className: "font-display text-display font-light" },
  { token: "display-sm", className: "font-display text-display-sm font-light" },
  { token: "heading", className: "font-display text-heading font-light" },
  { token: "subhead", className: "font-display text-subhead" },
  { token: "body-lg", className: "text-body-lg" },
  { token: "ui", className: "text-ui" },
  { token: "label", className: "text-label" },
  { token: "caption", className: "text-caption" },
];

const SPACING = ["w-1", "w-1.5", "w-2", "w-2.5", "w-3", "w-4", "w-5", "w-6", "w-8", "w-11", "w-14", "w-20"];

const BUTTON_VARIANTS = ["outline", "filled", "text", "default", "secondary", "ghost", "destructive", "link"] as const;
const BUTTON_SIZES = ["xs", "sm", "default", "md", "lg"] as const;

const all = (level: Level): Balance => Object.fromEntries(CATEGORIES.map((c) => [c.id, level]));
const MIXED: Balance = { spirituality: 2, exercise: 3, work: 1, creativity: 0, romance: 2, friends: 1 };

/** Every token and component, rendered from the real thing. */
export function Reference() {
  return (
    <PageFrame
      header={
        <header className="flex h-16 items-center justify-between gap-4 border-b border-rule-strong px-5 lg:px-10">
          <span className="font-heading text-subhead text-accent-ink">baby steps · system</span>
          <FrameToggle />
        </header>
      }
    >
      <main className="flex w-full flex-col gap-11 px-5 pt-10 pb-20 lg:px-10">
        <Section title="colour">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[...SURFACES, ...RULES].map((name) => (
              <Swatch key={name} token={name} />
            ))}
            {MOODS.map((mood) => (
              <Swatch key={mood} token={`mood-${mood}`} />
            ))}
          </div>
        </Section>

        <Section title="categories">
          <ul className="flex flex-col gap-6">
            {(Object.keys(CATEGORY_COLORS) as CategoryColor[]).map((key) => (
              <CategoryRow key={key} colorKey={key} />
            ))}
          </ul>
        </Section>

        <Section title="moods">
          <MoodSamples />
        </Section>

        <Section title="type">
          <ul className="flex flex-col gap-5">
            {TYPE.map((role) => (
              <TypeRow key={role.token} {...role} />
            ))}
          </ul>
        </Section>

        <Section title="spacing">
          <ul className="flex flex-col gap-2">
            {SPACING.map((width) => (
              <SpaceRow key={width} className={width} />
            ))}
          </ul>
        </Section>

        <Section title="buttons and chips">
          <Buttons />
        </Section>

        <Section title="balance">
          <BalanceSamples />
        </Section>
      </main>
    </PageFrame>
  );
}

function Section(props: { title: string; children: ReactNode }) {
  return (
    <section className={PANEL}>
      <h2 className="mb-5 font-display text-subhead text-ink">{props.title}</h2>
      {props.children}
    </section>
  );
}

/** Re-renders when theme or frame changes on <html>. */
function useRootChange() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const observer = new MutationObserver(() => setTick((n) => n + 1));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-frame", "data-theme", "style"],
    });
    return () => observer.disconnect();
  }, []);
  return tick;
}

/** A custom property's computed value, live. */
function useToken(name: string) {
  return useSyncExternalStore(
    subscribeRoot,
    () => getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim(),
    () => "",
  );
}

function subscribeRoot(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-frame", "data-theme", "style"],
  });
  return () => observer.disconnect();
}

function Swatch(props: { token: string }) {
  const value = useToken(props.token);
  return (
    <div className="flex flex-col gap-1.5">
      <span
        style={{ background: `var(--${props.token})` }}
        className="h-14 rounded-sm ring-1 ring-rule"
      />
      <span className="text-label text-ink">--{props.token}</span>
      <span className="tabular text-caption text-ink-muted">{value}</span>
    </div>
  );
}

function CategoryRow(props: { colorKey: CategoryColor }) {
  const color = categoryColor(props.colorKey);
  const ink = useToken(`cat-${props.colorKey}`);
  const text = useToken(`cat-${props.colorKey}-text`);
  const on = useToken(`cat-${props.colorKey}-on`);

  return (
    <li className="flex flex-wrap items-center gap-x-8 gap-y-3">
      <span className={`grid h-12 w-28 place-items-center rounded-sm text-label ${color.ink} ${color.on}`}>
        on · {on}
      </span>
      <span className="flex w-40 flex-col">
        <span className={`text-ui ${color.text}`}>{props.colorKey}</span>
        <span className="tabular text-caption text-ink-muted">
          ink {ink} · text {text}
        </span>
      </span>
      <span className="flex items-center gap-4">
        {STICKER_SIZES.map((size) => (
          <StickerMark
            key={size}
            size={size}
            sticker={{ name: `${props.colorKey} ${size}`, mark: MARKS[props.colorKey], colorKey: props.colorKey }}
          />
        ))}
      </span>
    </li>
  );
}

function MoodSamples() {
  const [mood, setMood] = useState<Mood | null>("good");
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-8">
        {MOODS.map((m) => (
          <div key={m} className="flex flex-col items-center gap-2">
            <span className="flex items-center gap-2">
              <MoodFace mood={m} size="sm" />
              <MoodFace mood={m} size="md" />
              <MoodFace mood={m} size="lg" />
              <MoodDot mood={m} />
            </span>
            <span className="text-caption text-ink-muted">{m}</span>
          </div>
        ))}
      </div>
      <div className="max-w-md">
        <MoodRow
          day={today()}
          mood={mood}
          onCommit={(change) => setMood(change.kind === "mood" ? change.mood : null)}
        />
      </div>
    </div>
  );
}

/** Measures its sample, so the numbers are whatever globals.css says. */
function TypeRow(props: { token: string; className: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const tick = useRootChange();
  const [size, setSize] = useState("");
  useEffect(() => {
    if (!ref.current) return;
    const style = getComputedStyle(ref.current);
    setSize(`${style.fontSize} / ${style.lineHeight} · ${style.fontWeight}`);
  }, [tick]);

  return (
    <li className="flex flex-col gap-1">
      <span className="tabular text-caption text-ink-muted">
        text-{props.token} · {size}
      </span>
      <span ref={ref} className={`text-ink lowercase ${props.className}`}>
        what have you been up to?
      </span>
    </li>
  );
}

function SpaceRow(props: { className: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState("");
  useEffect(() => {
    if (ref.current) setWidth(getComputedStyle(ref.current).width);
  }, []);
  return (
    <li className="flex items-center gap-4">
      <span className="tabular w-14 text-caption text-ink-muted">{props.className.slice(2)}</span>
      <span ref={ref} className={`h-3 bg-accent-ink ${props.className}`} />
      <span className="tabular text-caption text-ink-muted">{width}</span>
    </li>
  );
}

function Buttons() {
  const [chosen, setChosen] = useState<Set<string>>(new Set(["exercise"]));
  const toggle = (id: string) =>
    setChosen((was) => {
      const next = new Set(was);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="flex flex-col gap-6">
      <p className="text-caption text-ink-muted">tab through to see the focus ring.</p>
      <div className="overflow-x-auto">
        <table className="border-collapse text-left">
          <thead>
            <tr>
              <th className="pr-4 pb-2 text-caption font-normal text-ink-muted">variant</th>
              {BUTTON_SIZES.map((size) => (
                <th key={size} className="px-3 pb-2 text-caption font-normal text-ink-muted">
                  {size}
                </th>
              ))}
              <th className="px-3 pb-2 text-caption font-normal text-ink-muted">disabled</th>
            </tr>
          </thead>
          <tbody>
            {BUTTON_VARIANTS.map((variant) => (
              <tr key={variant}>
                <td className="py-2 pr-4 text-label text-ink">{variant}</td>
                {BUTTON_SIZES.map((size) => (
                  <td key={size} className="px-3 py-2">
                    <Button variant={variant} size={size}>
                      add sticker
                    </Button>
                  </td>
                ))}
                <td className="px-3 py-2">
                  <Button variant={variant} size="sm" disabled>
                    add sticker
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((category) => (
          <Chip
            key={category.id}
            variant={chosen.has(category.id) ? "chosen" : "suggestion"}
            colorKey={category.colorKey}
            onClick={() => toggle(category.id)}
          >
            {category.name}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function BalanceSamples() {
  const [levels, setLevels] = useState<Balance>(MIXED);
  return (
    <div className="flex flex-col gap-10">
      <div className="grid gap-8 sm:grid-cols-3">
        {(
          [
            ["all 0", all(0)],
            ["mixed", MIXED],
            ["all 3", all(3)],
          ] as const
        ).map(([label, value]) => (
          <figure key={label} className="flex flex-col items-center gap-2">
            <Flower categories={CATEGORIES} levels={value} className="w-full max-w-72" />
            <figcaption className="text-caption text-ink-muted">{label}</figcaption>
          </figure>
        ))}
      </div>

      {/* One state drives both. */}
      <div className="grid gap-8 sm:grid-cols-2">
        <figure className="flex flex-col items-center gap-2">
          <LifePie
            categories={CATEGORIES}
            levels={levels}
            onChange={(id, level) => setLevels((was) => ({ ...was, [id]: level }))}
            className="w-full max-w-72"
          />
          <figcaption className="text-caption text-ink-muted">life pie: click a ring</figcaption>
        </figure>
        <figure className="flex flex-col items-center gap-2">
          <Flower categories={CATEGORIES} levels={levels} className="w-full max-w-72" />
          <figcaption className="text-caption text-ink-muted">same levels</figcaption>
        </figure>
      </div>
    </div>
  );
}

/** Blush or espresso frame, via `data-frame` on <html>. */
function FrameToggle() {
  const [frame, setFrame] = useState<"blush" | "espresso">("blush");
  useEffect(() => {
    if (frame === "espresso") document.documentElement.dataset.frame = "espresso";
    else delete document.documentElement.dataset.frame;
    return () => {
      delete document.documentElement.dataset.frame;
    };
  }, [frame]);

  return (
    <nav aria-label="frame" className="text-label text-ink-muted">
      {(["blush", "espresso"] as const).map((name, i) => (
        <span key={name}>
          {i > 0 && <span aria-hidden="true"> · </span>}
          <button
            type="button"
            aria-pressed={frame === name}
            onClick={() => setFrame(name)}
            className={`underline-offset-4 hover:text-ink ${frame === name ? "text-ink underline decoration-accent-ink" : ""}`}
          >
            {name}
          </button>
        </span>
      ))}
    </nav>
  );
}
