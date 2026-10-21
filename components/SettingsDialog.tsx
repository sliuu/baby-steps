"use client";

import { useActionState, useEffect, useState, type RefObject } from "react";

import {
  deleteAccount,
  saveSettings,
  type SettingsResult,
} from "@/app/actions/settings";
import { signOut } from "@/app/actions/auth";
import { useSettings } from "@/components/SettingsProvider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LEVEL_RADII, PETAL_PATH } from "@/lib/balance-geometry";
import { PETAL_WEEK_CHOICES } from "@/lib/settings";
import { useReturnFocus } from "@/lib/useReturnFocus";
import { cn } from "@/lib/utils";

/** Boxed field: reads as something to change, not more text. */
const FIELD =
  "h-8 rounded-md border border-rule-input bg-paper px-s1 text-ui text-ink outline-none transition-colors hover:border-ink focus-visible:border-ink focus-visible:ring-2 focus-visible:ring-ink/20";

const SIZES = ["small", "medium", "large"] as const;

type Draft = {
  weeks: string;
  small: string;
  medium: string;
  large: string;
  weekStartsOn: string;
};

function sameDraft(a: Draft, b: Draft) {
  return (Object.keys(a) as (keyof Draft)[]).every((key) => a[key] === b[key]);
}

/** Title and hint on the left; a short control sits beside them, a long one below. */
function Section(props: {
  id: string;
  title: string;
  hint?: string;
  aside?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section aria-labelledby={props.id} className="flex flex-col gap-s3">
      <div className="flex flex-wrap items-center justify-between gap-x-s4 gap-y-s2">
        <div>
          <h3 id={props.id} className="font-display text-subhead text-ink">
            {props.title}
          </h3>
          {props.hint && <p className="text-label text-ink-muted">{props.hint}</p>}
        </div>
        {props.aside}
      </div>
      {props.children}
    </section>
  );
}

/** The petal each size grows, at the flower's own proportions. */
function Petal(props: { level: number }) {
  const height = (LEVEL_RADII[props.level] - 6) * 0.6;
  return (
    <svg
      aria-hidden="true"
      viewBox="-0.3 -1 0.6 1"
      style={{ height, width: height * 0.6 }}
      className="fill-cat-sage"
    >
      <path d={PETAL_PATH} />
    </svg>
  );
}

function Message(props: { result: SettingsResult }) {
  if (!props.result) return null;
  return (
    <p
      role={props.result.ok ? "status" : "alert"}
      className={cn(
        "text-label",
        props.result.ok ? "text-ink-muted" : "text-accent-ink",
      )}
    >
      {props.result.message}
    </p>
  );
}

type Props = {
  email: string | null;
  onClose: () => void;
  /** Where focus goes on close: the menu item that opened it is gone by then. */
  returnFocusTo?: RefObject<HTMLElement | null>;
};

/** Mounted only while open; closes on save. */
export function SettingsDialog(props: Props) {
  const settings = useSettings();
  const returnFocus = useReturnFocus(props.returnFocusTo);
  const [saved] = useState<Draft>(() => ({
    weeks: String(settings.petals.weeks),
    small: String(settings.petals.small),
    medium: String(settings.petals.medium),
    large: String(settings.petals.large),
    weekStartsOn: String(settings.weekStartsOn),
  }));
  const [draft, setDraft] = useState(saved);
  const [warning, setWarning] = useState(false);
  const dirty = !sameDraft(draft, saved);

  const [result, action, pending] = useActionState(
    async (prev: SettingsResult, form: FormData) => {
      const next = await saveSettings(prev, form);
      if (next?.ok) props.onClose();
      return next;
    },
    undefined,
  );

  // Browser-level warning for reloads and tab closes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setWarning(false);
  }

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (next) return;
        if (dirty) setWarning(true);
        else props.onClose();
      }}
    >
      <DialogContent
        {...returnFocus}
        aria-describedby={undefined}
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0 sm:max-w-lg"
      >
        <DialogHeader className="px-s4 pt-s4 pb-s3">
          <DialogTitle className="font-display text-heading font-light text-ink">
            settings
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-col gap-s6 overflow-y-auto px-s4 pt-s1 pb-s5">
          <form id="settings-form" action={action} className="flex flex-col gap-s6">
            <Section
              id="petals"
              title="petals"
              hint="stickers in a category it takes to grow each petal."
              aside={
                <label className="flex items-center gap-s1 text-label text-ink-muted">
                  over the last
                  <select
                    name="weeks"
                    value={draft.weeks}
                    onChange={(event) => set("weeks", event.target.value)}
                    className={FIELD}
                  >
                    {PETAL_WEEK_CHOICES.map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? "week" : "weeks"}
                      </option>
                    ))}
                  </select>
                </label>
              }
            >
              {/* The three sizes side by side, so the rule reads as growth. */}
              <div className="grid grid-cols-3 gap-s2 rounded-xl bg-secondary p-s3">
                {SIZES.map((size, i) => (
                  <label key={size} className="flex flex-col items-center gap-s1 text-label text-ink">
                    <span className="flex h-16 items-end">
                      <Petal level={i} />
                    </span>
                    {size}
                    <input
                      name={size}
                      type="number"
                      min={1}
                      max={999}
                      required
                      aria-label={`${size}: at least this many stickers`}
                      value={draft[size]}
                      onChange={(event) => set(size, event.target.value)}
                      className={cn(FIELD, "tabular w-14 [appearance:textfield] text-center [&::-webkit-inner-spin-button]:appearance-none")}
                    />
                  </label>
                ))}
              </div>
            </Section>

            <Section
              id="week"
              title="week starts on"
              hint="for the calendar and the petal weeks."
              aside={
                // Segmented: both choices visible, the chosen one filled.
                <div
                  role="radiogroup"
                  aria-labelledby="week"
                  className="inline-flex rounded-md border border-rule-input p-0.5"
                >
                  {[
                    { value: "0", label: "sunday" },
                    { value: "1", label: "monday" },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex h-7 cursor-pointer items-center rounded-[calc(var(--radius-md)-2px)] px-s2 text-label text-ink transition-colors has-checked:bg-ink has-checked:text-paper has-focus-visible:ring-2 has-focus-visible:ring-ink/30"
                    >
                      <input
                        type="radio"
                        name="weekStartsOn"
                        value={option.value}
                        checked={draft.weekStartsOn === option.value}
                        onChange={() => set("weekStartsOn", option.value)}
                        className="sr-only"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              }
            />
          </form>

          <AccountSection email={props.email} />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-s3 border-t border-rule px-s4 py-s3">
          {warning ? (
            <>
              <p role="alert" className="mr-auto text-label text-destructive">
                you have unsaved changes.
              </p>
              <Button
                type="button"
                variant="text"
                onClick={props.onClose}
                className="text-label"
              >
                discard
              </Button>
              <Button
                type="submit"
                form="settings-form"
                variant="filled"
                size="sm"
                disabled={pending}
              >
                save
              </Button>
            </>
          ) : (
            <>
              <div className="mr-auto">
                <Message result={result} />
              </div>
              <Button
                type="submit"
                form="settings-form"
                variant="filled"
                size="sm"
                disabled={pending || !dirty}
              >
                {pending ? "saving…" : "save"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AccountSection(props: { email: string | null }) {
  const [result, action, pending] = useActionState(deleteAccount, undefined);
  const [confirming, setConfirming] = useState(false);

  return (
    <Section
      id="account"
      title="account"
      hint={props.email ? `signed in as ${props.email}` : undefined}
      aside={
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">
            sign out
          </Button>
        </form>
      }
    >
      {/* Set apart and quiet: the one thing here you can't undo. */}
      <div className="border-t border-rule pt-s3">
        {!confirming ? (
          <div>
            <Button
              type="button"
              variant="text"
              onClick={() => setConfirming(true)}
              className="h-auto px-0 text-label text-destructive"
            >
              delete my account
            </Button>
          </div>
        ) : (
          <form action={action} className="flex flex-col gap-s3">
            <p className="text-label text-ink">
              this permanently deletes your account, stickers, moods, notes and
              settings. it can&rsquo;t be undone.
            </p>
            <label className="flex flex-col gap-1">
              <span className="text-caption text-ink">
                type &ldquo;delete&rdquo; to confirm
              </span>
              <input
                name="confirm"
                autoComplete="off"
                autoCapitalize="none"
                className={cn(FIELD, "max-w-60")}
              />
            </label>
            <div className="flex flex-wrap items-center gap-s3">
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                disabled={pending}
              >
                permanently delete
              </Button>
              <Button
                type="button"
                variant="text"
                onClick={() => setConfirming(false)}
                className="text-label"
              >
                cancel
              </Button>
              <Message result={result} />
            </div>
          </form>
        )}
      </div>
    </Section>
  );
}
