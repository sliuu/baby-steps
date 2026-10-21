"use client";

import { Popover as PopoverPrimitive } from "radix-ui";
import { X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import type { Pick, StepResult } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/Chip";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { categoryColor } from "@/lib/palette";
import type { LibraryGroup } from "@/lib/queries/activities";
import { suggestionsFor } from "@/lib/suggestions";
import { cn } from "@/lib/utils";

export type TourStep = "hello" | "stickers" | "tap" | "flower";

const STEPS: TourStep[] = ["hello", "stickers", "tap", "flower"];

/** Steps that point at something on Today. */
const ON_TODAY: TourStep[] = ["stickers", "tap", "flower"];

/** Writes: server actions when signed in, memory in the preview. */
export type TourActions = {
  /** Whose progress this browser remembers; a new account starts fresh. */
  user: string;
  save: (picks: Pick[]) => Promise<StepResult>;
  finish: () => Promise<StepResult>;
};

type Tour = {
  step: TourStep | null;
  /** A sticker went on today: the "tap" step is done. */
  placed: () => void;
  /** While another dialog is up (the phone sheet), the bubble steps aside. */
  pause: (paused: boolean) => void;
  /** The board hands over the library, for the stickers step. */
  setGroups: (groups: LibraryGroup[]) => void;
};

const TourContext = createContext<Tour | null>(null);

/** Null outside a tour, so the board can ask without caring. */
export function useTour() {
  return useContext(TourContext);
}

export const stepKey = (user: string) => `baby-steps:tour-step:${user}`;

/** Where this browser left off; storage can be blocked. */
function readStep(user: string): TourStep | "done" | null {
  try {
    const value = localStorage.getItem(stepKey(user));
    return value === "done" || STEPS.includes(value as TourStep) ? (value as TourStep | "done") : null;
  } catch {
    return null;
  }
}

function writeStep(user: string, step: TourStep | "done") {
  try {
    localStorage.setItem(stepKey(user), step);
  } catch {}
}

type Props = {
  /** Absent: no tour (already onboarded, or the demo). */
  actions?: TourActions;
  /** Null = Today, the landing. */
  page: string | null;
  showToday: () => void;
  children: React.ReactNode;
};

/** First-run tour over the real app: two cards, then two bubbles pointing at things. */
export function TourProvider(props: Props) {
  const [step, setStep] = useState<TourStep | null>(null);
  const [paused, setPaused] = useState(false);
  const [groups, setGroups] = useState<LibraryGroup[]>([]);
  const { actions, page, showToday } = props;
  const user = actions?.user ?? "";

  // After hydration: resume where this browser left off.
  useEffect(() => {
    if (!actions) return;
    const resume = () => {
      const saved = readStep(user);
      setStep(saved === "done" ? null : (saved ?? "hello"));
    };
    resume();
  }, [actions, user]);

  const go = useCallback((next: TourStep) => {
    writeStep(user, next);
    setStep(next);
  }, [user]);

  const end = useCallback(() => {
    writeStep(user, "done");
    setStep(null);
    // Best effort: this browser already remembers it's done.
    actions?.finish();
  }, [actions, user]);

  const advance = useCallback(() => {
    setStep((current) => {
      const next = current && STEPS[STEPS.indexOf(current) + 1];
      writeStep(user, next ?? "done");
      return next ?? null;
    });
  }, [user]);

  // The middle steps point at Today.
  useEffect(() => {
    if (step && ON_TODAY.includes(step) && page !== null && page !== "today") showToday();
  }, [step, page, showToday]);

  const placed = useCallback(() => {
    setStep((current) => {
      if (current !== "tap") return current;
      writeStep(user, "flower");
      return "flower";
    });
  }, [user]);

  const value = useMemo<Tour>(
    () => ({ step, placed, pause: setPaused, setGroups }),
    [step, placed],
  );

  return (
    <TourContext.Provider value={value}>
      {props.children}
      {actions && step === "hello" && (
        <Card
          step={step}
          title="hello! we're happy you're here"
          onSkip={end}
          action={<Button data-primary variant="filled" size="sm" onClick={() => go("stickers")}>let&rsquo;s go</Button>}
        />
      )}
      {actions && step === "stickers" && (
        <StickersCard groups={groups} save={actions.save} onDone={() => go("tap")} onSkip={end} />
      )}
      {actions && !paused && step === "tap" && (
        <Bubble
          step={step}
          anchors={TAP_ANCHORS}
          // Phones have no tray on the page, only the add tile.
          instead={{ add: "tap here to add stickers to your day" }}
          onNext={advance}
          onSkip={end}
        >
          click on them to add them to your day
        </Bubble>
      )}
      {actions && !paused && step === "flower" && (
        // The last step. Phones get it short, with the sign-off as the button.
        <Bubble
          step={step}
          anchors={FLOWER_ANCHORS}
          action={
            <>
              <span className="lg:hidden">have fun</span>
              <span className="hidden lg:inline">done</span>
            </>
          }
          onNext={end}
          onSkip={end}
        >
          <span className="lg:hidden">watch your flower grow, and see what needs attention.</span>
          <span className="hidden lg:inline">
            watch your flower grow, and notice over time what needs more attention.
            <span className="mt-s2 block">and always remember to have some fun.</span>
          </span>
        </Bubble>
      )}
    </TourContext.Provider>
  );
}

/** Four dots, the current one filled; read out as "step n of 6". */
function Progress(props: { step: TourStep }) {
  const at = STEPS.indexOf(props.step);
  return (
    <span className="flex items-center gap-1">
      <span className="sr-only">
        step {at + 1} of {STEPS.length}
      </span>
      {STEPS.map((s, i) => (
        <span
          key={s}
          aria-hidden="true"
          className={cn("size-1.5 rounded-full", i === at ? "bg-ink" : "bg-ink/20")}
        />
      ))}
    </span>
  );
}

/** First focus on the way on, not ✕: a reflexive Enter shouldn't end the tour. */
function focusPrimary(event: Event) {
  const button = (event.currentTarget as HTMLElement | null)?.querySelector<HTMLElement>("[data-primary]");
  if (!button) return;
  event.preventDefault();
  button.focus();
}

/** Tour copy: the display face, like Today's question. */
const COPY = "font-display text-body-lg font-light text-ink";

/** A centred card for the steps that point at nothing. ✕ and Escape skip the tour. */
function Card(props: {
  step: TourStep;
  title: string;
  hint?: string;
  action: React.ReactNode;
  onSkip: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && props.onSkip()}>
      <DialogContent
        // No hint, no description; with one, Radix links it.
        {...(props.hint ? {} : { "aria-describedby": undefined })}
        showCloseButton={false}
        onOpenAutoFocus={focusPrimary}
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-s4 p-s4 sm:max-w-lg"
      >
        <div className="flex items-start justify-between gap-s3">
          <div>
            <DialogTitle className={cn(COPY, "text-subhead italic")}>{props.title}</DialogTitle>
            {props.hint && <DialogDescription className="text-label text-ink-muted">{props.hint}</DialogDescription>}
          </div>
          <SkipButton onSkip={props.onSkip} />
        </div>
        {props.children}
        <div className="flex items-center justify-between gap-s3">
          <Progress step={props.step} />
          {props.action}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SkipButton(props: { onSkip: () => void }) {
  return (
    <Button variant="ghost" size="icon-sm" aria-label="skip the tour" onClick={props.onSkip} className="-mt-1 -mr-1 shrink-0 text-ink-muted hover:text-ink">
      <X className="size-4" strokeWidth={1.5} aria-hidden="true" />
    </Button>
  );
}

/** Starter stickers: each category's ideas, its first one picked so "next" alone works. */
function StickersCard(props: {
  groups: LibraryGroup[];
  save: TourActions["save"];
  onDone: () => void;
  onSkip: () => void;
}) {
  const categories = useMemo(
    () =>
      props.groups.map((group) => {
        const owned = group.stickers.filter((s) => !s.archived).map((s) => s.name);
        return {
          id: group.categoryId,
          name: group.categoryName.toLowerCase(),
          colorKey: group.colorKey,
          owned,
          suggestions: suggestionsFor(group.slug ?? "", owned),
        };
      }),
    [props.groups],
  );
  const owned = categories.reduce((n, c) => n + c.owned.length, 0);

  const [picks, setPicks] = useState<Pick[] | null>(null);
  // Defaults once the library arrives: the first idea in each empty category.
  const chosen =
    picks ??
    categories.flatMap((c) =>
      c.owned.length === 0 && c.suggestions[0]
        ? [{ categoryId: c.id, name: c.suggestions[0].name, mark: c.suggestions[0].mark }]
        : [],
    );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const has = (categoryId: string, name: string) => chosen.some((p) => p.categoryId === categoryId && p.name === name);
  const toggle = (pick: Pick) =>
    setPicks(
      has(pick.categoryId, pick.name)
        ? chosen.filter((p) => !(p.categoryId === pick.categoryId && p.name === pick.name))
        : [...chosen, pick],
    );

  const total = owned + chosen.length;

  return (
    <Card
      step="stickers"
      title="start by adding some stickers"
      hint="you can add more later."
      onSkip={props.onSkip}
      action={
        <div className="flex items-center gap-s3">
          {error && (
            <p role="alert" className="text-label text-accent-ink">
              {error}
            </p>
          )}
          <Button
            data-primary
            variant="filled"
            size="sm"
            disabled={pending || total === 0}
            onClick={() =>
              start(async () => {
                const result = chosen.length ? await props.save(chosen) : { ok: true, message: "" };
                if (result?.ok) props.onDone();
                else setError(result?.message ?? "that didn't save. try again.");
              })
            }
          >
            {pending ? "adding…" : chosen.length ? `add ${chosen.length}` : "next"}
          </Button>
        </div>
      }
    >
      {/* Scrolls on short screens; the title and buttons stay put. */}
      <div className="-mx-s4 flex min-h-0 flex-col gap-s3 overflow-y-auto border-y border-rule px-s4 py-s3">
        {categories.length === 0 && <p className="text-label text-ink-muted">loading…</p>}
        {categories.map((category) => (
          <section key={category.id} aria-labelledby={`tour-${category.id}`} className="flex flex-col gap-s1">
            <h3 id={`tour-${category.id}`} className="flex items-center gap-s1 text-label text-ink-muted">
              <span aria-hidden="true" className={cn("size-2 rounded-full", categoryColor(category.colorKey).dot)} />
              {category.name}
            </h3>
            <div className="flex flex-wrap gap-s1">
              {category.owned.map((name) => (
                <Chip key={`owned-${name}`} variant="chosen" colorKey={category.colorKey} disabled className="cursor-default lowercase">
                  {name}
                </Chip>
              ))}
              {category.suggestions.map((s) => (
                <Chip
                  key={s.name}
                  variant={has(category.id, s.name) ? "chosen" : "suggestion"}
                  colorKey={category.colorKey}
                  onClick={() => toggle({ categoryId: category.id, name: s.name, mark: s.mark })}
                >
                  {s.name}
                </Chip>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Card>
  );
}

type Anchor = "tray" | "add" | "flower";

// Constants, so the bubble's effect runs once per step. Desktop's tray, else the phone's add tile.
const TAP_ANCHORS: Anchor[] = ["tray", "add"];
const FLOWER_ANCHORS: Anchor[] = ["flower"];

/** The first `[data-tour]` match that's on screen at this width. */
function findAnchor(names: Anchor[]): HTMLElement | null {
  for (const name of names) {
    for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)) {
      if (el.getClientRects().length > 0) return el;
    }
  }
  return null;
}

/** Which side of its anchor a bubble sits on, so it covers neither it nor what it's about. */
function sideFor(el: HTMLElement): "top" | "bottom" | "left" {
  if (el.dataset.tour === "tray") return "top";
  if (el.dataset.tour === "add") return "bottom";
  return matchMedia("(min-width: 64rem)").matches ? "left" : "top";
}

/** A speech bubble with a tail, pointing at part of the page. Doesn't block it. */
function Bubble(props: {
  step: TourStep;
  anchors: Anchor[];
  /** Other words when the bubble lands on a fallback anchor. */
  instead?: Partial<Record<Anchor, string>>;
  /** The button's words; "next" by default. */
  action?: React.ReactNode;
  onNext: () => void;
  onSkip: () => void;
  children: React.ReactNode;
}) {
  const anchor = useRef<HTMLElement | null>(null);
  const [side, setSide] = useState<"top" | "bottom" | "left" | null>(null);
  const [found, setFound] = useState<Anchor | null>(null);
  const { anchors } = props;

  // Polls briefly: the board may still be loading, or the tray just opening.
  useEffect(() => {
    let tries = 0;
    let frame = 0;
    const timer = window.setInterval(() => {
      const el = findAnchor(anchors);
      if (!el && ++tries < 25) return;
      window.clearInterval(timer);
      anchor.current = el;
      if (!el) return;
      const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const side = sideFor(el);
      // Above the flower, the bubble needs the room: bring its bottom in, no further.
      const block = side === "top" && el.dataset.tour === "flower" ? "end" : "center";
      el.scrollIntoView({ block, behavior: still ? "auto" : "smooth" });
      // Show once the page stops moving, so the bubble doesn't ride the scroll.
      let y = window.scrollY;
      let calm = 0;
      const started = performance.now();
      const settle = () => {
        calm = window.scrollY === y ? calm + 1 : 0;
        y = window.scrollY;
        if (calm < 6 && performance.now() - started < 1200) {
          frame = requestAnimationFrame(settle);
          return;
        }
        setFound(el.dataset.tour as Anchor);
        setSide(side);
      };
      frame = requestAnimationFrame(settle);
    }, 80);
    return () => {
      window.clearInterval(timer);
      cancelAnimationFrame(frame);
    };
  }, [anchors]);

  if (!side) return null;

  return (
    <PopoverPrimitive.Root open>
      <PopoverPrimitive.Anchor virtualRef={anchor as React.RefObject<HTMLElement>} />
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side={side}
          align={side === "left" ? "center" : "start"}
          sideOffset={10}
          collisionPadding={16}
          aria-label="tour"
          // Hints, not a modal: the page stays usable, so only ✕ ends it.
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}
          // "tap" wants your hands on the tray, so focus stays there.
          onOpenAutoFocus={(event) => (props.step === "tap" ? event.preventDefault() : focusPrimary(event))}
          className="z-40 flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-s3 rounded-xl bg-popover p-s3 text-ink shadow-menu ring-1 ring-rule outline-none animate-in fade-in-0 zoom-in-95 duration-200 motion-reduce:animate-none"
        >
          <div className="flex items-start justify-between gap-s2">
            <p role="status" className={COPY}>
              {(found && props.instead?.[found]) ?? props.children}
            </p>
            <SkipButton onSkip={props.onSkip} />
          </div>
          <div className="flex items-center justify-between gap-s3">
            <Progress step={props.step} />
            <Button data-primary variant="filled" size="sm" onClick={props.onNext}>
              {props.action ?? "next"}
            </Button>
          </div>
          <PopoverPrimitive.Arrow width={16} height={8} className="fill-popover" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
