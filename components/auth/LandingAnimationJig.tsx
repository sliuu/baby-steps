"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

type Timings = {
  heroDuration: number;
  heroRise: number;
  copyDelay: number;
  actionsDelay: number;
  fallDuration: number;
  fallDrop: number;
  stickerStart: number;
  stickerGap: number;
  strikeWait: number;
  strikeDuration: number;
  strikeGap: number;
};

type Groups = {
  text: boolean;
  stickers: boolean;
  strikes: boolean;
};

type Hsv = {
  hue: number;
  saturation: number;
  value: number;
};

type Palette = {
  background: Hsv;
  border: Hsv;
};

type MotionStyle = CSSProperties & {
  "--dur-hero": string;
  "--hero-rise": string;
  "--hero-copy-delay": string;
  "--hero-actions-delay": string;
  "--dur-fall": string;
  "--fall-drop": string;
  "--sticker-start": string;
  "--sticker-gap": string;
  "--dur-strike": string;
  "--strike-wait": string;
  "--strike-gap": string;
  "--paper": string;
  "--frame": string;
};

const DEFAULTS: Timings = {
  heroDuration: 420,
  heroRise: 12,
  copyDelay: 240,
  actionsDelay: -450,
  fallDuration: 620,
  fallDrop: 28,
  stickerStart: 160,
  stickerGap: 160,
  strikeWait: 425,
  strikeDuration: 475,
  strikeGap: 150,
};

const ALL_ON: Groups = { text: true, stickers: true, strikes: true };

// The current ivory paper and espresso frame, expressed as HSV so the jig
// opens on the real palette rather than an approximation.
const DEFAULT_PALETTE: Palette = {
  background: { hue: 54, saturation: 3.9, value: 100 },
  border: { hue: 25, saturation: 30.8, value: 30.6 },
};

function hsvToHex({ hue, saturation, value }: Hsv) {
  const chroma = (value / 100) * (saturation / 100);
  const section = hue / 60;
  const second = chroma * (1 - Math.abs((section % 2) - 1));
  const match = value / 100 - chroma;
  const [red, green, blue] =
    section < 1
      ? [chroma, second, 0]
      : section < 2
        ? [second, chroma, 0]
        : section < 3
          ? [0, chroma, second]
          : section < 4
            ? [0, second, chroma]
            : section < 5
              ? [second, 0, chroma]
              : [chroma, 0, second];

  return `#${[red, green, blue]
    .map((channel) => Math.round((channel + match) * 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

/** Development-only controls for tuning the signed-out page's entrance. */
export function LandingAnimationJig(props: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [timings, setTimings] = useState(DEFAULTS);
  const [groups, setGroups] = useState(ALL_ON);
  const [palette, setPalette] = useState(DEFAULT_PALETTE);
  const [playback, setPlayback] = useState(0);
  const [copied, setCopied] = useState(false);
  // Last values played; Strict Mode re-runs effects, so compare instead of counting runs.
  const played = useRef({ timings, groups });

  const replay = () => setPlayback((current) => current + 1);

  // Debounced so dragging a range doesn't remount the page per pixel.
  useEffect(() => {
    if (played.current.timings === timings && played.current.groups === groups) return;
    played.current = { timings, groups };
    const timer = window.setTimeout(replay, 140);
    return () => window.clearTimeout(timer);
  }, [timings, groups]);

  const motionStyle: MotionStyle = {
    "--dur-hero": `${groups.text ? timings.heroDuration : 1}ms`,
    "--hero-rise": `${groups.text ? timings.heroRise : 0}px`,
    "--hero-copy-delay": `${groups.text ? timings.copyDelay : 0}ms`,
    "--hero-actions-delay": `${groups.text ? timings.actionsDelay : 0}ms`,
    "--dur-fall": `${groups.stickers ? timings.fallDuration : 1}ms`,
    "--fall-drop": `${groups.stickers ? timings.fallDrop : 0}px`,
    "--sticker-start": `${groups.stickers ? timings.stickerStart : 0}ms`,
    "--sticker-gap": `${groups.stickers ? timings.stickerGap : 0}ms`,
    "--dur-strike": `${groups.strikes ? timings.strikeDuration : 1}ms`,
    "--strike-wait": `${groups.strikes ? timings.strikeWait : 0}ms`,
    "--strike-gap": `${groups.strikes ? timings.strikeGap : 0}ms`,
    "--paper": hsvToHex(palette.background),
    "--frame": hsvToHex(palette.border),
  };

  function range(
    key: keyof Timings,
    label: string,
    min: number,
    max: number,
    step: number,
    unit: "ms" | "px",
  ) {
    return (
      <label key={key} className="grid gap-1.5">
        <span className="flex items-baseline justify-between gap-3 text-caption text-ink">
          <span>{label}</span>
          <output className="tabular-nums text-ink-muted">
            {timings[key]}{unit}
          </output>
        </span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={timings[key]}
          onChange={(event) =>
            setTimings((current) => ({
              ...current,
              [key]: Number(event.target.value),
            }))
          }
          className="h-4 w-full cursor-pointer accent-accent-ink"
        />
      </label>
    );
  }

  function toggle(key: keyof Groups, label: string) {
    return (
      <label key={key} className="flex cursor-pointer items-center gap-2 text-label text-ink">
        <input
          type="checkbox"
          checked={groups[key]}
          onChange={(event) =>
            setGroups((current) => ({ ...current, [key]: event.target.checked }))
          }
          className="size-4 accent-accent-ink"
        />
        {label}
      </label>
    );
  }

  function colorControls(key: keyof Palette, label: string) {
    const color = palette[key];
    const hex = hsvToHex(color);

    const channels: Array<{
      key: keyof Hsv;
      label: string;
      max: number;
      step: number;
      suffix: string;
    }> = [
      { key: "hue", label: "hue", max: 359, step: 1, suffix: "°" },
      { key: "saturation", label: "saturation", max: 100, step: 0.1, suffix: "%" },
      { key: "value", label: "value", max: 100, step: 0.1, suffix: "%" },
    ];

    return (
      <fieldset className="mt-5 grid gap-3 border-t border-rule pt-4">
        <legend className="pr-2 font-display text-ui text-ink">{label}</legend>
        <div className="flex items-center gap-2 text-caption text-ink-muted">
          <span
            aria-hidden="true"
            className="size-4 rounded-full ring-1 ring-rule"
            style={{ backgroundColor: hex }}
          />
          <output className="tabular-nums uppercase">{hex}</output>
        </div>
        {channels.map((channel) => (
          <label key={channel.key} className="grid gap-1.5">
            <span className="flex items-baseline justify-between gap-3 text-caption text-ink">
              <span>{channel.label}</span>
              <output className="tabular-nums text-ink-muted">
                {color[channel.key]}{channel.suffix}
              </output>
            </span>
            <input
              type="range"
              min={0}
              max={channel.max}
              step={channel.step}
              value={color[channel.key]}
              onChange={(event) =>
                setPalette((current) => ({
                  ...current,
                  [key]: {
                    ...current[key],
                    [channel.key]: Number(event.target.value),
                  },
                }))
              }
              className="h-4 w-full cursor-pointer accent-accent-ink"
            />
          </label>
        ))}
      </fieldset>
    );
  }

  async function copyValues() {
    const css = [
      `--dur-hero: ${timings.heroDuration}ms;`,
      `--hero-rise: ${timings.heroRise}px;`,
      `--hero-copy-delay: ${timings.copyDelay}ms;`,
      `--hero-actions-delay: ${timings.actionsDelay}ms;`,
      `--dur-fall: ${timings.fallDuration}ms;`,
      `--fall-drop: ${timings.fallDrop}px;`,
      `--sticker-start: ${timings.stickerStart}ms;`,
      `--sticker-gap: ${timings.stickerGap}ms;`,
      `--dur-strike: ${timings.strikeDuration}ms;`,
      `--strike-wait: ${timings.strikeWait}ms;`,
      `--strike-gap: ${timings.strikeGap}ms;`,
      `--paper: ${hsvToHex(palette.background)};`,
      `--frame: ${hsvToHex(palette.border)};`,
    ].join("\n");

    await navigator.clipboard.writeText(css);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <>
      {/* `contents` keeps this development boundary out of the page layout. */}
      <div key={playback} className="contents" style={motionStyle}>
        {props.children}
      </div>

      {open ? (
        <aside
          aria-label="landing animation controls"
          className="fixed right-4 bottom-4 z-60 flex max-h-[calc(100dvh-2rem)] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl bg-paper shadow-menu ring-1 ring-rule"
        >
          <header className="flex items-center justify-between gap-4 border-b border-rule px-4 py-3">
            <div>
              <h2 className="font-display text-body-lg text-ink">motion jig</h2>
              <p className="text-caption text-ink-muted">development only</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-label text-ink-muted underline-offset-4 hover:text-ink hover:underline"
            >
              hide
            </button>
          </header>

          <div className="scrollbar-app min-h-0 overflow-y-auto px-4 py-4">
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {toggle("text", "text")}
              {toggle("stickers", "stickers")}
              {toggle("strikes", "strikes")}
            </div>

            <fieldset disabled={!groups.text} className="mt-5 grid gap-3 disabled:opacity-40">
              <legend className="mb-2 font-display text-ui text-ink">text</legend>
              {range("heroDuration", "duration", 100, 1000, 10, "ms")}
              {range("heroRise", "rise", 0, 48, 1, "px")}
              {range("copyDelay", "copy delay", 0, 600, 10, "ms")}
              {range("actionsDelay", "actions after last line", -900, 900, 10, "ms")}
            </fieldset>

            <fieldset disabled={!groups.stickers} className="mt-5 grid gap-3 border-t border-rule pt-4 disabled:opacity-40">
              <legend className="pr-2 font-display text-ui text-ink">stickers</legend>
              {range("fallDuration", "fall duration", 150, 1500, 10, "ms")}
              {range("fallDrop", "drop distance", 0, 120, 1, "px")}
              {range("stickerStart", "start delay", 0, 1200, 10, "ms")}
              {range("stickerGap", "stagger", 0, 250, 5, "ms")}
            </fieldset>

            <fieldset disabled={!groups.strikes} className="mt-5 grid gap-3 border-t border-rule pt-4 disabled:opacity-40">
              <legend className="pr-2 font-display text-ui text-ink">strikes</legend>
              {range("strikeWait", "start delay", 0, 2000, 25, "ms")}
              {range("strikeDuration", "duration", 100, 1000, 25, "ms")}
              {range("strikeGap", "gap", 0, 750, 25, "ms")}
            </fieldset>

            {colorControls("background", "background")}
            {colorControls("border", "border")}
          </div>

          <footer className="flex flex-wrap items-center gap-2 border-t border-rule px-4 py-3">
            <button
              type="button"
              onClick={replay}
              className="rounded-full border border-ink px-3.5 py-1.5 text-label text-ink transition-transform active:scale-97"
            >
              replay
            </button>
            <button
              type="button"
              onClick={() => {
                setTimings(DEFAULTS);
                setGroups(ALL_ON);
                setPalette(DEFAULT_PALETTE);
              }}
              className="px-2 py-1.5 text-label text-ink-muted underline-offset-4 hover:text-ink hover:underline"
            >
              reset
            </button>
            <button
              type="button"
              onClick={() => void copyValues()}
              className="ml-auto px-2 py-1.5 text-label text-ink-muted underline-offset-4 hover:text-ink hover:underline"
            >
              {copied ? "copied" : "copy values"}
            </button>
          </footer>
        </aside>
      ) : (
        <button
          type="button"
          aria-expanded="false"
          onClick={() => setOpen(true)}
          className="fixed right-4 bottom-4 z-60 rounded-full border border-ink bg-paper px-4 py-2 text-label text-ink shadow-menu transition-transform active:scale-97"
        >
          motion jig
        </button>
      )}
    </>
  );
}
