"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";

import {
  addActivities,
  finishOnboarding,
  saveRatings,
  type Pick,
  type StepResult,
} from "@/app/actions/onboarding";
import { LifePie } from "@/components/balance/LifePie";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/Chip";
import { verdict, type Balance, type Level } from "@/lib/balance";
import { categoryColor } from "@/lib/palette";
import { formatUS } from "@/lib/phone";
import { NAME_MAX } from "@/lib/stickers";
import { defaultMark, type Suggestion } from "@/lib/suggestions";

export type StepCategory = {
  id: string;
  /** Lowercase. */
  name: string;
  slug: string;
  colorKey: string;
  /** Names already in the tray. */
  owned: string[];
  suggestions: Suggestion[];
};

// copy: TODO — placeholder headings until Stephanie writes them.
const HEADING = "font-display text-heading font-light text-ink sm:text-display-sm";
const DASHED =
  "h-10 w-full rounded-none border-0 border-b border-dashed border-rule-input bg-transparent px-0 text-ui text-ink outline-none placeholder:text-ink-subtle focus-visible:border-solid focus-visible:border-ink";

function Problem(props: { result: StepResult }) {
  if (!props.result) return null;
  return (
    <p role="alert" className="text-label text-accent-ink">
      {props.result.message}
    </p>
  );
}

function Actions(props: { back?: string; children: React.ReactNode }) {
  return (
    <div className="mt-11 flex flex-wrap items-center gap-x-6 gap-y-3">
      {props.children}
      {props.back && (
        <Button variant="text" asChild>
          <Link href={props.back}>back</Link>
        </Button>
      )}
    </div>
  );
}

/** Step 1: rate each category 0–3; the verdict updates live. */
export function PieStep(props: { categories: StepCategory[]; initial: Record<string, number> }) {
  const [levels, setLevels] = useState<Balance>(() =>
    Object.fromEntries(props.categories.map((c) => [c.id, (props.initial[c.id] ?? 0) as Level])),
  );
  const [result, setResult] = useState<StepResult>();
  const [pending, start] = useTransition();

  return (
    <>
      <h1 className={HEADING}>how full is each part of your life right now?</h1>
      <p className="mt-4 text-label text-ink-muted">tap a ring to fill a slice; tap it again to empty it.</p>

      <LifePie
        categories={props.categories}
        levels={levels}
        onChange={(id, level) => setLevels((was) => ({ ...was, [id]: level }))}
        className="mx-auto mt-8 w-full max-w-90"
      />

      <p aria-live="polite" className="mx-auto mt-6 max-w-120 text-center text-body-lg text-ink">
        {verdict(levels, props.categories)}
      </p>

      <Actions>
        <Button
          variant="filled"
          size="md"
          disabled={pending}
          onClick={() => start(async () => setResult(await saveRatings(levels)))}
        >
          next
        </Button>
        <Problem result={result} />
      </Actions>
    </>
  );
}

/** Step 2: pick suggestions or add your own, per category. */
export function ActivitiesStep(props: { categories: StepCategory[] }) {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [result, setResult] = useState<StepResult>();
  const [pending, start] = useTransition();

  const has = (categoryId: string, name: string) =>
    picks.some((p) => p.categoryId === categoryId && p.name.toLowerCase() === name.toLowerCase());
  const toggle = (pick: Pick) =>
    setPicks((was) =>
      has(pick.categoryId, pick.name)
        ? was.filter((p) => !(p.categoryId === pick.categoryId && p.name === pick.name))
        : [...was, pick],
    );

  return (
    <>
      <h1 className={HEADING}>what do you like to do?</h1>
      <p className="mt-4 text-label text-ink-muted">pick a few to start your tray. you can change them any time.</p>

      <div className="mt-8 flex flex-col gap-8">
        {props.categories.map((category) => {
          const customs = picks.filter(
            (p) =>
              p.categoryId === category.id &&
              !category.suggestions.some((s) => s.name === p.name),
          );
          return (
            <section key={category.id} aria-labelledby={`cat-${category.id}`}>
              <h2 id={`cat-${category.id}`} className={`text-ui ${categoryColor(category.colorKey).text}`}>
                {category.name}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {category.owned.map((name) => (
                  <Chip key={`owned-${name}`} variant="chosen" colorKey={category.colorKey} disabled className="cursor-default lowercase">
                    {name}
                  </Chip>
                ))}
                {category.suggestions.map((s) => {
                  const chosen = has(category.id, s.name);
                  return (
                    <Chip
                      key={s.name}
                      variant={chosen ? "chosen" : "suggestion"}
                      colorKey={category.colorKey}
                      onClick={() => toggle({ categoryId: category.id, name: s.name, mark: s.mark })}
                    >
                      {s.name}
                    </Chip>
                  );
                })}
                {customs.map((p) => (
                  <Chip key={`custom-${p.name}`} variant="chosen" colorKey={category.colorKey} onClick={() => toggle(p)}>
                    {p.name}
                  </Chip>
                ))}
                <AddOwn
                  label={category.name}
                  taken={(name) =>
                    has(category.id, name) ||
                    category.owned.some((n) => n.toLowerCase() === name.toLowerCase())
                  }
                  onAdd={(name) =>
                    toggle({ categoryId: category.id, name, mark: defaultMark(category.slug, name) })
                  }
                />
              </div>
            </section>
          );
        })}
      </div>

      <Actions back="/onboarding?step=1">
        <Button
          variant="filled"
          size="md"
          disabled={pending}
          onClick={() => start(async () => setResult(await addActivities(picks)))}
        >
          next
        </Button>
        <Problem result={result} />
      </Actions>
    </>
  );
}

/** Dashed "add your own" chip that opens into an input; enter adds. */
function AddOwn(props: { label: string; taken: (name: string) => boolean; onAdd: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  if (!open) {
    return (
      <Chip variant="suggestion" onClick={() => setOpen(true)}>
        add your own
      </Chip>
    );
  }

  return (
    <input
      autoFocus
      aria-label={`add your own ${props.label} activity`}
      maxLength={NAME_MAX}
      value={value}
      placeholder="name it, then enter"
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setValue("");
          setOpen(false);
        }
        if (event.key !== "Enter") return;
        event.preventDefault();
        const name = value.trim();
        if (name && !props.taken(name)) props.onAdd(name);
        setValue("");
      }}
      onBlur={() => !value.trim() && setOpen(false)}
      className="h-8 w-44 border-0 border-b border-dashed border-rule-input bg-transparent text-label text-ink outline-none placeholder:text-ink-subtle focus-visible:border-solid focus-visible:border-ink"
    />
  );
}

/** Step 3: optional phone + consent. Nothing is sent yet. */
export function TouchStep(props: { phone: string | null }) {
  const [result, action, pending] = useActionState(finishOnboarding, undefined);

  return (
    <>
      <h1 className={HEADING}>want a little nudge?</h1>
      <p className="mt-4 max-w-120 text-ui text-ink">
        we can send a gentle reminder by text each day. reply with what you did and we&rsquo;ll log it
        for you.
      </p>

      <form action={action} className="mt-8 flex max-w-90 flex-col gap-5">
        <label className="flex flex-col gap-1">
          <span className="text-label text-ink-muted">phone number</span>
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(555) 555-5555"
            defaultValue={props.phone ? formatUS(props.phone) : ""}
            className={DASHED}
          />
        </label>

        <label className="flex items-center gap-3 text-ui text-ink">
          <input name="optIn" type="checkbox" defaultChecked={Boolean(props.phone)} className="size-4 accent-ink" />
          text me reminders
        </label>

        {/* Carrier registration needs these; keep them. */}
        <p className="text-caption text-ink-muted">
          up to one text a day. reply STOP to opt out, HELP for help. message and data rates may
          apply.
        </p>

        <Problem result={result} />

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Button type="submit" name="intent" value="texts" variant="filled" size="md" disabled={pending}>
            set up texting
          </Button>
          <Button type="submit" name="intent" value="skip" variant="text" disabled={pending}>
            skip for now
          </Button>
          <Button variant="text" asChild>
            <Link href="/onboarding?step=2">back</Link>
          </Button>
        </div>
      </form>
    </>
  );
}
