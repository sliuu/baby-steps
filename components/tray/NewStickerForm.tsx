"use client";

import { Plus, SmilePlus } from "lucide-react";
import { useActionState, useState } from "react";

import { createActivity } from "@/app/actions/activities";
import { StickerMark } from "@/components/calendar/StickerMark";
import { TrayRowFace } from "@/components/tray/TrayGroup";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ramp } from "@/lib/palette";
import { readDraft, validateDraft, type DraftField } from "@/lib/stickers";

/** Ties the failing input to the sentence explaining it. */
const ERROR_ID = "new-sticker-error";

/**
 * A starting point, not a keyboard.
 *
 * Typing an emoji takes a system picker most people have never opened, so the
 * mark field would in practice be letters only. Forty-eight covering roughly
 * what the six life areas are about is enough to make the field feel like a
 * choice; the input beside it still accepts anything you can type or paste.
 */
const EMOJI = [
  "🏃", "🚴", "🏋️", "🧘", "🏊", "🥾", "⚽", "🎯",
  "💤", "💧", "🥗", "🍎", "🌱", "🧹", "⏰", "📿",
  "🙏", "🕯️", "✨", "🌅", "🌙", "🍀", "🪶", "☮️",
  "💼", "💻", "📈", "📝", "📞", "📊", "✉️", "🗂️",
  "🎨", "🎸", "🎹", "📷", "✏️", "📚", "🎭", "🧩",
  "❤️", "🌹", "🗺️", "✈️", "🏕️", "☕", "🎉", "🐕",
];

/** The life areas, as the form needs them: an id, a name, and a colour. */
export type FormArea = {
  id: string;
  name: string;
  colorKey: string;
};

type Props = {
  areas: FormArea[];
};

/**
 * The tray's `+`, and the dialog behind it.
 *
 * Split in two on purpose. Everything the form knows — what you've typed, what
 * went wrong — lives in `StickerFields`, which Radix mounts when the dialog
 * opens and unmounts when it closes. So closing the dialog *is* the reset:
 * there is no clearing code, no effect watching `open`, and no chance of
 * reopening onto last time's half-filled form or a stale error message.
 */
export function NewStickerForm(props: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* An SVG rather than a "+" character. Flex centres a glyph's line box,
            not its ink, and a serif plus sits on the font's math axis a little
            below the middle of that box — so it reads low in a round button. A
            nudge would fix it for EB Garamond at one size and be wrong again in
            Georgia while the webfont is still loading. Drawn, it's centred by
            geometry in any font. */}
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="New sticker"
          title="New sticker"
        >
          <Plus strokeWidth={1.5} />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">New sticker</DialogTitle>
          <DialogDescription>
            A mark, a name, and where it belongs.
          </DialogDescription>
        </DialogHeader>

        <StickerFields areas={props.areas} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

type FieldsProps = Props & {
  onDone: () => void;
};

/** What went wrong, and which input it belongs to. `null` is "nothing yet". */
type Problem = { field: DraftField | null; message: string } | null;

function StickerFields(props: FieldsProps) {
  const { areas, onDone } = props;

  const [name, setName] = useState("");
  const [mark, setMark] = useState("");
  const [lifeAreaId, setLifeAreaId] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

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
   * It also means `createActivity` keeps a plain `(formData) => result`
   * signature rather than the `(previousState, formData)` shape `useActionState`
   * would otherwise impose on it — the previous state is only ever consulted
   * here, and here it isn't consulted at all.
   */
  const [problem, submit, pending] = useActionState<Problem, FormData>(
    async (_previous, formData) => {
      const check = validateDraft(readDraft(formData));
      if (!check.ok) return { field: check.field, message: check.message };

      const result = await createActivity(formData);
      if (!result.ok) return { field: result.field, message: result.message };

      onDone();
      return null;
    },
    null,
  );

  const area = areas.find((candidate) => candidate.id === lifeAreaId);

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
      "aria-describedby": invalid ? ERROR_ID : undefined,
    };
  }

  return (
    <form action={submit} className="flex flex-col gap-5">
      {/* The sticker as it will look in the rail, drawn by the same two
          components that draw it there — so this is a preview in the literal
          sense rather than an impression of one. Before an area is chosen the
          circle shows `ramp()`'s fallback, which is the same thing the grid
          would show for an unrecognised colour: one fallback, one appearance.

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
          <Label htmlFor="sticker-mark">Mark</Label>
          <div className="flex items-center gap-1.5">
            {/* No maxLength, and that's the whole lesson of this field: the
                attribute counts UTF-16 code units, so maxLength={1} accepts
                "A" and silently truncates every emoji into half a surrogate
                pair. The rule "one character" can only be enforced by counting
                graphemes, which is what validateDraft does on both sides. */}
            <Input
              id="sticker-mark"
              name="mark"
              value={mark}
              onChange={(event) => setMark(event.target.value)}
              autoComplete="off"
              placeholder="G"
              className="w-12 text-center"
              {...fieldProps("mark")}
            />
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                {/* type="button", and it is load-bearing. A <button> inside a
                    <form> submits by default, so without this, opening the
                    emoji picker would post a half-filled form. */}
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Pick an emoji"
                  title="Pick an emoji"
                >
                  <SmilePlus strokeWidth={1.5} />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-fit">
                <div className="grid grid-cols-8 gap-0.5">
                  {EMOJI.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setMark(emoji);
                        setPickerOpen(false);
                      }}
                      className="grid size-7 place-items-center rounded-md text-base transition-colors hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink/40"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Label htmlFor="sticker-name">Name</Label>
          <Input
            id="sticker-name"
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
        <Label htmlFor="sticker-area">Life area</Label>
        {/* `name` is what makes a Radix Select part of the form: given one, it
            renders a hidden native <select> alongside the button, so the value
            arrives in FormData like any other field. Without it the trigger is
            just a button and `lifeArea` would always be empty. */}
        <Select name="lifeArea" value={lifeAreaId} onValueChange={setLifeAreaId}>
          <SelectTrigger
            id="sticker-area"
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
        <p className="text-[0.8rem] text-ink-muted">
          It takes that area&rsquo;s colour, and names are unique within it.
        </p>
      </div>

      {/* Rendered always, filled sometimes — a live region the browser only
          discovers at the moment it gains text often doesn't announce. Same
          pattern, and the same red as, the tray's error line. */}
      <div role="status" aria-live="polite" className="empty:hidden">
        {problem && (
          <p
            id={ERROR_ID}
            className="rounded-md bg-ramp-red-soft px-2 py-1.5 text-[0.9rem]"
          >
            {problem.message}
          </p>
        )}
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        {/* Disabled for the length of the round trip, which is what stops a
            double-click becoming two inserts — the second of which would hit
            the unique constraint and report a name clash with itself. */}
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add sticker"}
        </Button>
      </DialogFooter>
    </form>
  );
}
