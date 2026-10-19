import { PAGE_WIDTH } from "@/lib/layout";

type Props = {
  /** Logo, plus anything beside it. */
  start: React.ReactNode;
  end?: React.ReactNode;
};

/** Top of the sheet: logo left, actions right, an inset rule under both. */
export function SheetHeader(props: Props) {
  return (
    <header className={PAGE_WIDTH}>
      <div className="flex items-end justify-between gap-s4 border-b border-rule-input pt-s4 pb-s2 sm:pt-s6 sm:pb-s3">
        <div className="flex min-w-0 items-center gap-s3">{props.start}</div>
        {props.end && <div className="flex shrink-0 items-center gap-s5">{props.end}</div>}
      </div>
    </header>
  );
}
