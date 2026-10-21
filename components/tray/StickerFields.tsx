"use client";

import { useActionState, useId, useState, type ReactNode } from "react";

import type { SaveResult } from "@/app/actions/activities";
import { MarkPicker } from "@/components/tray/MarkPicker";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/Chip";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MARK_ICON_SIZE, MARK_STROKE, iconFor } from "@/lib/icons";
import { categoryColor } from "@/lib/palette";
import { readDraft, validateDraft, type DraftField } from "@/lib/stickers";
import type { Suggestion } from "@/lib/suggestions";
import { cn } from "@/lib/utils";

export type FormCategory = {
  id: string;
  name: string;
  colorKey: string;
  /** Unused starting ideas; only the new-sticker form shows them. */
  suggestions?: Suggestion[];
};

/** What the three inputs start out holding. Empty strings mean a new sticker. */
export type StickerValues = {
  name: string;
  mark: string;
  categoryId: string;
};

const BLANK: StickerValues = { name: "", mark: "", categoryId: "" };

/** Stationery input: no box, dashed bottom rule. */
const DASHED =
  "h-10 rounded-none border-0 border-b border-dashed border-rule-input bg-transparent px-0 text-ui focus-visible:border-solid focus-visible:border-ink focus-visible:ring-0 dark:bg-transparent";
const LABEL = "text-label font-normal text-ink-muted";

type Props = {
  categories: FormCategory[];
  /** The row being written, already bound (create, or update with its id). */
  action: (formData: FormData) => Promise<SaveResult>;
  /** Pre-filled values. Omitted when making a sticker from scratch. */
  initial?: StickerValues;
  /** Edit only: the past marks' category, for the "marks move" warning. */
  historyCategory?: string;
  /** Show the category's suggestion chips above the name. */
  suggest?: boolean;
  submitLabel: string;
  pendingLabel: string;
  onDone: () => void;
  /** Left end of the footer: archive/delete on the edit dialog. */
  footerStart?: ReactNode;
};

/** What went wrong, and which input it belongs to. `null` is "nothing yet". */
type Problem = { field: DraftField | null; message: string } | null;

/**
 * Category, mark, name and the buttons — shared by create and edit.
 * Mounted only while its dialog is open, so closing is the reset.
 */
export function StickerFields(props: Props) {
  const { categories, initial = BLANK, onDone } = props;

  const [name, setName] = useState(initial.name);
  const [mark, setMark] = useState(initial.mark);
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const errorId = useId();

  // Same validator as the server, run first so obvious mistakes skip the round trip.
  const [problem, submit, pending] = useActionState<Problem, FormData>(
    async (_previous, formData) => {
      const check = validateDraft(readDraft(formData));
      if (!check.ok) return { field: check.field, message: check.message };

      const result = await props.action(formData);
      if (!result.ok) return { field: result.field, message: result.message };

      onDone();
      return null;
    },
    null,
  );

  // An icon mark is drawn, submitted from a hidden input, and replaced by typing.
  const markIcon = iconFor(mark);

  const category = categories.find((candidate) => candidate.id === categoryId);
  const color = categoryColor(category?.colorKey ?? "");
  const suggestions = props.suggest ? (category?.suggestions ?? []) : [];

  const moving =
    props.historyCategory !== undefined && categoryId !== props.historyCategory;

  function fieldProps(field: DraftField) {
    const invalid = problem?.field === field;
    return {
      "aria-invalid": invalid,
      "aria-describedby": invalid ? errorId : undefined,
    };
  }

  return (
    <form action={submit} className="flex flex-col gap-s4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${errorId}-category`} className={LABEL}>
          category
        </Label>
        {/* `name` makes Radix render a hidden native select for FormData. */}
        <Select name="category" value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger
            id={`${errorId}-category`}
            className={cn(DASHED, "w-full shadow-none")}
            {...fieldProps("category")}
          >
            <SelectValue placeholder="choose one" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                <span
                  aria-hidden="true"
                  className={`size-2.5 rounded-full ${categoryColor(option.colorKey).dot}`}
                />
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {moving && (
          <p className="text-caption text-ink-muted">
            marks you’ve already placed move with it, so past months will show
            it under the new category.
          </p>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-col gap-s1">
          <p className={LABEL}>ideas</p>
          <ul className="flex flex-wrap gap-s1">
            {suggestions.map((idea) => {
              const chosen = name.trim() === idea.name && mark === idea.mark;
              return (
                <li key={idea.name}>
                  <Chip
                    variant={chosen ? "chosen" : "suggestion"}
                    colorKey={category?.colorKey}
                    onClick={() => {
                      setName(chosen ? "" : idea.name);
                      setMark(chosen ? "" : idea.mark);
                    }}
                  >
                    {idea.name}
                  </Chip>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="flex items-end gap-s3">
        {/* The mark field is the preview: the sticker's own fill around the input. */}
        <div
          className={`relative size-11 shrink-0 rounded-full border border-transparent ${color.ink} ${color.on}`}
        >
          {markIcon && (
            <>
              {/* 1.35rem keeps the icon at StickerMark's proportion of its circle. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 grid place-items-center text-[1.35rem]"
              >
                <markIcon.Icon className={MARK_ICON_SIZE} strokeWidth={MARK_STROKE} />
              </span>
              <input type="hidden" name="mark" value={mark} />
            </>
          )}
          {/* No maxLength: it counts UTF-16 units; validateDraft counts graphemes. */}
          <Input
            name={markIcon ? undefined : "mark"}
            value={markIcon ? "" : mark}
            onChange={(event) => setMark(event.target.value)}
            autoComplete="off"
            aria-label={markIcon ? `mark: ${markIcon.label}` : "mark"}
            placeholder={markIcon ? "" : "G"}
            className="font-emoji size-full rounded-full border-0 bg-transparent px-0 text-center text-base text-inherit dark:bg-transparent"
            {...fieldProps("mark")}
          />
          <MarkPicker onPick={setMark} className="absolute -right-1 -bottom-1 rounded-full" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Label htmlFor={`${errorId}-name`} className={LABEL}>
            name
          </Label>
          <Input
            id={`${errorId}-name`}
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="off"
            autoFocus
            placeholder="gym"
            className={DASHED}
            {...fieldProps("name")}
          />
        </div>
      </div>

      {/* Always rendered so the live region announces. */}
      <div role="status" aria-live="polite" className="empty:hidden">
        {problem && (
          <p id={errorId} className="rounded-md bg-accent-ink/10 text-accent-ink px-s1 py-1.5 text-label">
            {problem.message}
          </p>
        )}
      </div>

      <DialogFooter className="border-rule bg-transparent sm:items-center">
        {props.footerStart && <div className="sm:mr-auto">{props.footerStart}</div>}
        <DialogClose asChild>
          <Button type="button" variant="text" size="sm">
            cancel
          </Button>
        </DialogClose>
        {/* Disabled during the round trip so a double-click isn't two writes. */}
        <Button type="submit" variant="filled" size="sm" disabled={pending}>
          {pending ? props.pendingLabel : props.submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
