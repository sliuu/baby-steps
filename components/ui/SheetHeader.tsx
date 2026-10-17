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
      <div className="flex items-end justify-between gap-6 border-b border-rule-input pt-6 pb-3 sm:pt-10 sm:pb-4">
        <div className="flex min-w-0 items-baseline gap-4">{props.start}</div>
        {props.end && <div className="flex shrink-0 items-center gap-8">{props.end}</div>}
      </div>
    </header>
  );
}
