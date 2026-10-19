"use client";

import { useActionState, useEffect, useState } from "react";

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
import { formatUS } from "@/lib/phone";
import { PETAL_WEEK_CHOICES } from "@/lib/settings";
import { cn } from "@/lib/utils";

const UNDERLINE =
  "border-0 border-b border-rule-input bg-transparent px-0 text-ui text-ink outline-none placeholder:text-ink-subtle focus-visible:border-ink";

const SIZES = ["small", "medium", "large"] as const;

type Draft = {
  weeks: string;
  small: string;
  medium: string;
  large: string;
  weekStartsOn: string;
  phone: string;
  optIn: boolean;
};

function sameDraft(a: Draft, b: Draft) {
  return (Object.keys(a) as (keyof Draft)[]).every((key) => a[key] === b[key]);
}

function Section(props: {
  id: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={props.id}
      className="border-t border-rule pt-s4 first:border-0 first:pt-0"
    >
      <h3 id={props.id} className="font-display text-body-lg text-ink">
        {props.title}
      </h3>
      {props.hint && (
        <p className="mt-1 text-label text-ink-muted">{props.hint}</p>
      )}
      <div className="mt-s3">{props.children}</div>
    </section>
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
  /** E.164, or null when texts are off. */
  phone: string | null;
  email: string | null;
  onClose: () => void;
};

/** Mounted only while open; closes on save. */
export function SettingsDialog(props: Props) {
  const settings = useSettings();
  const [saved] = useState<Draft>(() => ({
    weeks: String(settings.petals.weeks),
    small: String(settings.petals.small),
    medium: String(settings.petals.medium),
    large: String(settings.petals.large),
    weekStartsOn: String(settings.weekStartsOn),
    phone: props.phone ? formatUS(props.phone) : "",
    optIn: Boolean(props.phone),
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
        aria-describedby={undefined}
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0 sm:max-w-lg"
      >
        <DialogHeader className="px-s4 pt-s4 pb-s3">
          <DialogTitle className="font-display text-heading font-light text-ink">
            settings
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-col gap-s4 overflow-y-auto px-s4 pb-s4">
          <form
            id="settings-form"
            action={action}
            className="flex flex-col gap-s4"
          >
            <Section
              id="petals"
              title="petals"
              hint="how many stickers in a category grow its petal."
            >
              <div className="flex flex-col gap-s3">
                <label className="flex items-center gap-s2 text-label text-ink">
                  counting the last
                  <select
                    name="weeks"
                    value={draft.weeks}
                    onChange={(event) => set("weeks", event.target.value)}
                    className={cn(UNDERLINE, "h-9")}
                  >
                    {PETAL_WEEK_CHOICES.map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? "week" : "weeks"}
                      </option>
                    ))}
                  </select>
                </label>
                {SIZES.map((size) => (
                  <label
                    key={size}
                    className="flex items-center gap-s2 text-label text-ink"
                  >
                    <span className="w-16">{size}</span>
                    at least
                    <input
                      name={size}
                      type="number"
                      min={1}
                      max={999}
                      required
                      value={draft[size]}
                      onChange={(event) => set(size, event.target.value)}
                      className={cn(UNDERLINE, "h-9 w-14 text-center")}
                    />
                    stickers
                  </label>
                ))}
              </div>
            </Section>

            <Section
              id="week"
              title="week starts on"
              hint="for the calendar and the petal weeks."
            >
              <div
                role="radiogroup"
                aria-labelledby="week"
                className="flex gap-s4"
              >
                {[
                  { value: "0", label: "sunday" },
                  { value: "1", label: "monday" },
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-s1 text-label text-ink"
                  >
                    <input
                      type="radio"
                      name="weekStartsOn"
                      value={option.value}
                      checked={draft.weekStartsOn === option.value}
                      onChange={() => set("weekStartsOn", option.value)}
                      className="size-4 accent-ink"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </Section>

            <Section
              id="texts"
              title="texts"
              hint="clear the number to stop texts."
            >
              <div className="flex flex-col gap-s3">
                <label className="flex flex-col gap-1">
                  <span className="text-caption text-ink">phone number</span>
                  <input
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder="(555) 555-5555"
                    value={draft.phone}
                    onChange={(event) => set("phone", event.target.value)}
                    className={cn(UNDERLINE, "h-10 w-full max-w-80")}
                  />
                </label>
                <label className="flex items-center gap-s2 text-label text-ink">
                  <input
                    name="optIn"
                    type="checkbox"
                    checked={draft.optIn}
                    onChange={(event) => set("optIn", event.target.checked)}
                    className="size-4 accent-ink"
                  />
                  text me reminders
                </label>
              </div>
            </Section>
          </form>

          <AccountSection email={props.email} />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-s3 border-t border-rule px-s4 py-s3">
          {warning ? (
            <>
              <p role="alert" className="mr-auto text-label text-accent-ink">
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
                variant="outline"
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
                variant="outline"
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
    >
      <div className="flex flex-col gap-s4">
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">
            sign out
          </Button>
        </form>

        {!confirming ? (
          <div>
            <Button
              type="button"
              variant="text"
              onClick={() => setConfirming(true)}
              className="text-label text-destructive"
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
                className={cn(UNDERLINE, "h-10 max-w-60")}
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
