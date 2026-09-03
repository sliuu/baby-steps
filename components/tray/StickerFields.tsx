"use client";

import { useActionState, useId, useState, type ReactNode } from "react";

import type { SaveResult } from "@/app/actions/activities";
import { StickerMark } from "@/components/calendar/StickerMark";
import { EmojiPicker } from "@/components/tray/EmojiPicker";
import { TrayRowFace } from "@/components/tray/TrayGroup";
import { Button } from "@/components/ui/button";
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
import { ramp } from "@/lib/palette";
import { readDraft, validateDraft, type DraftField } from "@/lib/stickers";

/** The life areas, as the form needs them: an id, a name, and a colour. */
export type FormArea = {
  id: string;
  name: string;
  colorKey: string;
};

/** What the three inputs start out holding. Empty strings mean a new sticker. */
export type StickerValues = {
  name: string;
  mark: string;
  lifeAreaId: string;
};

const BLANK: StickerValues = { name: "", mark: "", lifeAreaId: "" };

type Props = {
  areas: FormArea[];
  /**
   * The row being written, already bound.
   *
   * The whole reason this component has two callers. `createActivity` takes
   * `(formData)` and `updateActivity` takes `(activityId, formData)`, and the
   * difference is not this component's business — the caller closes over the id
   * and hands down one shape. So there is no `mode` prop and no `if (editing)`
   * anywhere below: the verb on the button is a string, and the row to write is
   * a function.
   */
  action: (formData: FormData) => Promise<SaveResult>;
  /** Pre-filled values. Omitted when making a new sticker from scratch. */
  initial?: StickerValues;
  /**
   * The area this sticker's existing marks sit under — so changing the dropdown
   * can warn that they'd all move. Only the edit dialog has an answer.
   *
   * This was derived until the `+` on each life area arrived. The old rule was
   * `initial.lifeAreaId !== ""`, on the reasoning that only an edit arrives with
   * an area already chosen — self-answering, and documented as the reason there
   * was no `mode` prop. A create that opens with its area pre-filled breaks
   * exactly that assumption, and the symptom would have been a brand-new sticker
   * warning you about past marks it cannot have.
   *
   * Still not a mode flag: it's a value, it means one specific thing, and the
   * question it answers is "is there history to move", which is the question the
   * sentence is actually about. The old version was a proxy for it that happened
   * to agree.
   */
  historyArea?: string;
  /** "Add sticker" / "Save changes". */
  submitLabel: string;
  /** "Adding…" / "Saving…". */
  pendingLabel: string;
  onDone: () => void;
  /**
   * Anything that belongs beside Cancel and Save but isn't part of saving —
   * today, the archive and delete controls on the edit dialog.
   *
   * A slot for the same reason `TrayRow.action` is one: what goes in here owns
   * its own confirmation state and calls its own actions, and a callback would
   * mean this component held both. It sits at the far left of the footer, which
   * is where a control that isn't the happy path belongs — well away from the
   * button your hand is already moving towards.
   */
  footerStart?: ReactNode;
};

/** What went wrong, and which input it belongs to. `null` is "nothing yet". */
type Problem = { field: DraftField | null; message: string } | null;

/**
 * The three fields, the preview, and the buttons — shared by both dialogs.
 *
 * It moved out of `NewStickerForm` the moment editing arrived, which is this
 * project's standing rule for shared code: it moves when the second caller
 * does, not when someone predicts one. Same as `firstGrapheme` in Step 10 and
 * `lib/charts.ts` in Step 14.
 *
 * What makes the sharing honest is that create and edit genuinely are the same
 * form. Same three inputs, same validator, same error mapping, same preview,
 * same unique constraint to bump into. If they had diverged anywhere real, two
 * components would have been the right answer — the tell is that the only
 * differences left are two strings and a bound argument.
 *
 * It still holds all of its own state, and the dialogs above still mount it
 * only while they're open. That's what makes closing the dialog the reset:
 * there is no clearing code, no effect watching `open`, and no chance of
 * reopening onto last time's typing or a stale error. It's also what makes
 * `initial` safe to read once — this component is born when the dialog opens
 * and dies when it closes, so there is no "the prop changed underneath me" case
 * to handle.
 */
export function StickerFields(props: Props) {
  const { areas, initial = BLANK, onDone } = props;

  const [name, setName] = useState(initial.name);
  const [mark, setMark] = useState(initial.mark);
  const [lifeAreaId, setLifeAreaId] = useState(initial.lifeAreaId);

  /**
   * Unique per mounted form, rather than one constant string.
   *
   * It was a module-level constant while there was one dialog and could only
   * ever be one. There still can only be one open at a time — but the id is now
   * generated by two different components, and a duplicate `id` in a document
   * points `aria-describedby` at whichever one the browser found first. `useId`
   * costs nothing and removes the question.
   */
  const errorId = useId();

  /**
   * The form's action: both checks, three lines apart.
   *
   * `useActionState` gives back the action's last return value, a function to
   * hand to `<form action={…}>`, and a pending flag that lasts exactly as long
   * as the round trip. The function here is *ours* — a client function that
   * wraps the Server Action — which buys two things:
   *
   * 1. The friendly check. `validateDraft` runs on the same FormData the
   *    server would receive, so an empty name never leaves the browser and the
   *    message appears with no round trip at all. It is the same function the
   *    action calls, so the two can't drift and the sentence is identical.
   * 2. Somewhere to put "and then close". The success path is a UI decision,
   *    not the server's, so it belongs on this side.
   *
   * It also means the actions keep a plain `(formData) => result` signature
   * rather than the `(previousState, formData)` shape `useActionState` would
   * otherwise impose — the previous state is only ever consulted here, and here
   * it isn't consulted at all.
   */
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

  const area = areas.find((candidate) => candidate.id === lifeAreaId);

  /**
   * Are we about to move an existing sticker's history to a different area?
   *
   * Only true when there is history — `historyArea` is undefined for both kinds
   * of create, including the one that opens with an area already chosen.
   */
  const moving =
    props.historyArea !== undefined && lifeAreaId !== props.historyArea;

  /**
   * Mark the field the complaint is about, and point it at the sentence.
   *
   * `aria-invalid` is what turns an input's border red — shadcn styles it — and
   * `aria-describedby` is what makes a screen reader read the message when
   * focus lands on the field, rather than leaving it stranded in the live
   * region at the bottom.
   */
  function fieldProps(field: DraftField) {
    const invalid = problem?.field === field;
    return {
      "aria-invalid": invalid,
      "aria-describedby": invalid ? errorId : undefined,
    };
  }

  return (
    <form action={submit} className="flex flex-col gap-5">
      {/* The sticker as it will look in the rail, drawn by the same two
          components that draw it there — so this is a preview in the literal
          sense rather than an impression of one. Before an area is chosen the
          circle shows `ramp()`'s fallback, which is the same thing the grid
          would show for an unrecognised colour: one fallback, one appearance.

          It earns its keep twice over when editing: change the life area and
          the circle changes colour before you commit to anything, which is the
          part of a recategorisation you'd otherwise only find out about by
          saving and looking at the tray.

          Hidden from screen readers: every word in it is something the user
          just typed into a field two inches below, and the empty state says
          "Your sticker", which is a placeholder rather than information. */}
      <div
        aria-hidden="true"
        className="flex items-center gap-2.5 rounded-md border border-dashed border-hairline px-2 py-1.5"
      >
        <TrayRowFace
          visual={
            <StickerMark
              sticker={{
                name: name.trim(),
                mark,
                colorKey: area?.colorKey ?? "",
              }}
            />
          }
          name={name.trim() || "Your sticker"}
        />
      </div>

      <div className="flex items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${errorId}-mark`}>Mark</Label>
          <div className="flex items-center gap-1.5">
            {/* No maxLength, and that's the whole lesson of this field: the
                attribute counts UTF-16 code units, so maxLength={1} accepts
                "A" and silently truncates every emoji into half a surrogate
                pair. The rule "one character" can only be enforced by counting
                graphemes, which is what validateDraft does on both sides. */}
            <Input
              id={`${errorId}-mark`}
              name="mark"
              value={mark}
              onChange={(event) => setMark(event.target.value)}
              autoComplete="off"
              placeholder="G"
              className="w-12 text-center"
              {...fieldProps("mark")}
            />
            {/* Sets the field rather than owning it. The input above is still
                the value — you can type or paste a letter into it and never
                open this — which is why the picker takes a setter and keeps no
                idea of what's currently chosen. */}
            <EmojiPicker onPick={setMark} />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Label htmlFor={`${errorId}-name`}>Name</Label>
          <Input
            id={`${errorId}-name`}
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="off"
            autoFocus
            placeholder="Gym"
            {...fieldProps("name")}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${errorId}-area`}>Life area</Label>
        {/* `name` is what makes a Radix Select part of the form: given one, it
            renders a hidden native <select> alongside the button, so the value
            arrives in FormData like any other field. Without it the trigger is
            just a button and `lifeArea` would always be empty. */}
        <Select name="lifeArea" value={lifeAreaId} onValueChange={setLifeAreaId}>
          <SelectTrigger
            id={`${errorId}-area`}
            className="w-full"
            {...fieldProps("lifeArea")}
          >
            <SelectValue placeholder="Choose one" />
          </SelectTrigger>
          <SelectContent>
            {areas.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {/* The soft end. This dot used to be the full ramp, because
                    tint is perceived by area and 10px is no area at all. That
                    was right about the problem and wrong about the fix — the
                    answer was to deepen the ramp rather than to saturate one
                    dot, and now the swatch matches both the sticker it will
                    produce and the identical dot in Trends' area table. Three
                    places, one dot, one meaning. */}
                <span
                  aria-hidden="true"
                  className={`size-2.5 rounded-full ${ramp(option.colorKey).soft}`}
                />
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Two sentences that swap, rather than one that's always right.

            Moving a sticker doesn't just change what colour it is from now on —
            `tally` reads an activity's area as it stands *now*, so every mark
            it has ever made moves with it, and last month's Trends page
            redraws. That was decided deliberately back in Step 12 ("you
            reclassified the habit, not the days") and it is the right
            behaviour, but it is not a thing anyone would guess from a dropdown.
            It only appears once you've actually changed the value, because a
            warning about a thing you haven't done is noise the other 90% of the
            time. */}
        <p className="text-[0.8rem] text-ink-muted">
          {moving
            ? "Marks you've already placed move with it, so past months will show it under the new area."
            : "It takes that area’s colour, and names are unique within it."}
        </p>
      </div>

      {/* Rendered always, filled sometimes — a live region the browser only
          discovers at the moment it gains text often doesn't announce. Same
          pattern, and the same red as, the tray's error line. */}
      <div role="status" aria-live="polite" className="empty:hidden">
        {problem && (
          <p
            id={errorId}
            className="rounded-md bg-ramp-red-soft px-2 py-1.5 text-[0.9rem]"
          >
            {problem.message}
          </p>
        )}
      </div>

      <DialogFooter>
        {/* `sm:mr-auto` is what puts it at the other end: the footer is a
            right-aligned row, and an auto margin on the first child eats all
            the space between it and the pair that follows. */}
        {props.footerStart && (
          <div className="sm:mr-auto">{props.footerStart}</div>
        )}
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        {/* Disabled for the length of the round trip, which is what stops a
            double-click becoming two writes — on a create, the second one hits
            the unique constraint and reports a name clash with itself. */}
        <Button type="submit" disabled={pending}>
          {pending ? props.pendingLabel : props.submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
