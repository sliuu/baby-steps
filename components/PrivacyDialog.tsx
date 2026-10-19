"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const HEADING = "font-display text-subhead text-ink";
const PROSE = "mt-s1 text-ui text-ink-muted";
const LINK = "text-ink underline underline-offset-4 hover:text-accent-ink";

/** Footer link that opens a short privacy promise, true to how the app is built. */
export function PrivacyDialog(props: { className?: string }) {
  return (
    <Dialog>
      <DialogTrigger className={props.className}>privacy</DialogTrigger>
      <DialogContent
        aria-describedby={undefined}
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-s2 sm:max-w-lg"
      >
        <DialogHeader className="px-s4 pt-s4 pb-s3">
          <DialogTitle className="font-display text-heading font-light text-ink">
            privacy policy
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-col gap-s4 overflow-y-auto px-s4 pb-s4">
          <p className="text-ui text-ink-muted">
            baby steps is a small, personal project. we don&rsquo;t read your stickers, moods or
            notes, and we never sell or share them. there are no ads and no analytics trackers.
          </p>

          <section>
            <h2 className={HEADING}>what we keep</h2>
            <p className={PROSE}>
              your name, email and profile picture are from google sign-in; the stickers, moods, notes
              and settings you add; and a phone number only if you give one for texts.
            </p>
          </section>

          <section>
            <h2 className={HEADING}>how it&rsquo;s protected</h2>
            <p className={PROSE}>
              everything lives in a supabase postgres database, sent over https and encrypted at
              rest. row-level security protects every row in your account.
            </p>
          </section>

          <section>
            <h2 className={HEADING}>check for yourself</h2>
            <p className={PROSE}>
              the code is open on{" "}
              <a href="https://github.com/sliuu/baby-steps" className={LINK}>
                github
              </a>
              . to have your account and everything in it deleted, or to ask a question,{" "}
              <a href="mailto:stxphanieliu@gmail.com" className={LINK}>
                get in touch
              </a>
              .
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
