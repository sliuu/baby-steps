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
import { cn } from "@/lib/utils";

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

const HEADING = "font-display text-heading font-light text-ink sm:text-display-sm";
const PROSE = "max-w-120 text-ui text-ink";
const LINK = "text-label text-ink underline underline-offset-4 hover:text-accent-ink";
const UNDERLINE =
  "w-full border-0 border-b bg-transparent px-0 text-ui text-ink outline-none placeholder:text-ink-subtle focus-visible:border-ink";

function Message(props: { result: StepResult }) {
  if (!props.result) return null;
  return (
    <p role={props.result.ok ? "status" : "alert"} className={cn("text-label", props.result.ok ? "text-ink-muted" : "text-accent-ink")}>
      {props.result.message}
    </p>
  );
}

/** Rule, then back on the left and the way on at the right. */
function Footer(props: { back?: string; children: React.ReactNode }) {
  return (
    <div className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-rule pt-6">
      {props.back && (
        <Link href={props.back} className={LINK}>
          back
        </Link>
      )}
      <div className="ml-auto flex flex-wrap items-center justify-end gap-x-6 gap-y-3">{props.children}</div>
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
      <div className="grid gap-10 pb-12 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-16">
        <div>
          {/* Stephanie's copy, from the onboarding board. */}
          <h1 className={HEADING}>
            hello! we&rsquo;re <span className="text-accent-ink">happy you&rsquo;re here</span>
          </h1>
          <div className={cn(PROSE, "mt-6 flex flex-col gap-4")}>
            <p>
              i made this little corner of the internet inspired by the &ldquo;life pie&rdquo; from{" "}
              <i>the artist&rsquo;s way</i>.
            </p>
            <p>
              the idea is to think about our lives like this pie. we pour our energy into different
              pieces, but sometimes we end up lopsided and need a bit of correction
            </p>
            <p>to try it yourself now, rank how fulfilled you feel in each category around the circle.</p>
          </div>
          <p className="mt-4 text-caption text-ink-muted">tap a ring to fill it in. tap it again to empty it.</p>

          <p
            aria-live="polite"
            className="mt-8 hidden border-t border-rule pt-6 font-display text-subhead font-light text-accent-ink lg:block"
          >
            {verdict(levels, props.categories)}
          </p>
        </div>

        <div>
          <LifePie
            categories={props.categories}
            levels={levels}
            onChange={(id, level) => setLevels((was) => ({ ...was, [id]: level }))}
            className="mx-auto w-full max-w-120"
          />
          {/* Phones: the verdict follows the pie. */}
          <p className="mt-6 border-t border-rule pt-6 font-display text-subhead font-light text-accent-ink lg:hidden">
            {verdict(levels, props.categories)}
          </p>
        </div>
      </div>

      <Footer>
        <Message result={result} />
        <Button
          variant="outline"
          size="md"
          disabled={pending}
          onClick={() => start(async () => setResult(await saveRatings(levels)))}
        >
          next
        </Button>
      </Footer>
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
      <h1 className={cn(HEADING, "max-w-200")}>
        add activities you do or would like to do for each category, or take inspiration from our
        templates
      </h1>

      {/* Ruled grid: lines between cells, none on the outside. */}
      <div className="mt-8 mb-12 grid overflow-hidden sm:grid-cols-2 lg:grid-cols-3">
        {props.categories.map((category) => {
          const color = categoryColor(category.colorKey);
          const customs = picks.filter(
            (p) =>
              p.categoryId === category.id &&
              !category.suggestions.some((s) => s.name === p.name),
          );
          return (
            <section
              key={category.id}
              aria-labelledby={`cat-${category.id}`}
              className="-mt-px -ml-px border-t border-l border-rule px-0 py-6 sm:px-5"
            >
              <h2 id={`cat-${category.id}`} className="flex items-center gap-2 font-display text-body-lg text-ink">
                <span aria-hidden="true" className={cn("size-2.5 rounded-full", color.dot)} />
                {category.name}
              </h2>
              <div className="mt-4 flex flex-wrap items-center gap-2">
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
                {customs.map((p) => (
                  <Chip key={`custom-${p.name}`} variant="chosen" colorKey={category.colorKey} onClick={() => toggle(p)}>
                    {p.name}
                  </Chip>
                ))}
              </div>
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
            </section>
          );
        })}
      </div>

      <Footer back="/onboarding?step=1">
        <Message result={result} />
        <Button
          variant="outline"
          size="md"
          disabled={pending}
          onClick={() => start(async () => setResult(await addActivities(picks)))}
        >
          next
        </Button>
      </Footer>
    </>
  );
}

/** Dashed input with an "add" link; enter also adds. */
function AddOwn(props: { label: string; taken: (name: string) => boolean; onAdd: (name: string) => void }) {
  const [value, setValue] = useState("");
  const add = () => {
    const name = value.trim();
    if (name && !props.taken(name)) props.onAdd(name);
    setValue("");
  };

  return (
    <div className="mt-5 flex max-w-80 items-end gap-4">
      <input
        aria-label={`add your own ${props.label} activity`}
        maxLength={NAME_MAX}
        value={value}
        placeholder="add your own"
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          add();
        }}
        className={cn(UNDERLINE, "h-8 border-dashed border-rule-input text-label focus-visible:border-solid")}
      />
      <button type="button" onClick={add} className={LINK}>
        add
      </button>
    </div>
  );
}

/** Step 3: optional phone + consent, then today. Nothing is sent yet. */
export function TouchStep(props: { phone: string | null }) {
  const [result, action, pending] = useActionState(finishOnboarding, undefined);

  return (
    <form action={action} className="flex flex-1 flex-col">
      <h1 className="font-display text-display-sm font-light text-accent-ink sm:text-display">great!</h1>
      <div className={cn(PROSE, "mt-4 flex max-w-160 flex-col gap-4")}>
        <p>
          now you can come back here and log how you&rsquo;re spending your time, track your life
          pie, and see how things change over the months.
        </p>
        <p>
          if you&rsquo;d like to log by text instead, you can set that up here, and we&rsquo;ll
          remind you daily to send us a text about what you&rsquo;ve been up to
        </p>
      </div>

      <section aria-labelledby="texting" className="mt-8 mb-12 border-t border-rule pt-8">
        <h2 id="texting" className="font-display text-body-lg text-ink">
          text message
        </h2>
        {/* copy: TODO — Stephanie's line goes here. */}
        <p className="mt-2 text-label text-ink-muted">text what you did, whenever you want.</p>

        <div className="mt-6 flex max-w-100 flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-caption text-ink">phone number</span>
            <input
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="(555) 555-5555"
              defaultValue={props.phone ? formatUS(props.phone) : ""}
              className={cn(UNDERLINE, "h-10 border-rule-input")}
            />
          </label>

          <label className="flex items-center gap-3 text-label text-ink">
            <input name="optIn" type="checkbox" defaultChecked={Boolean(props.phone)} className="size-4 accent-ink" />
            text me reminders
          </label>

          {/* Carrier registration needs these; keep them. */}
          <p className="text-caption text-ink-muted">
            up to one text a day. reply STOP to opt out, HELP for help. message and data rates may
            apply.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" name="intent" value="texts" variant="outline" size="sm" disabled={pending}>
              set up texting
            </Button>
            <Message result={result} />
          </div>
        </div>
      </section>

      <Footer back="/onboarding?step=2">
        <Button type="submit" name="intent" value="done" variant="text" disabled={pending} className={LINK}>
          skip for now
        </Button>
        <Button type="submit" name="intent" value="done" variant="filled" size="md" disabled={pending}>
          go to my day
        </Button>
      </Footer>
    </form>
  );
}
