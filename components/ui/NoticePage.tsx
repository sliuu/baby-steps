import Link from "next/link";

import { LOGO, PAGE_WIDTH } from "@/lib/layout";
import { PageFrame } from "./PageFrame";
import { SheetHeader } from "./SheetHeader";

type Props = {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  action: React.ReactNode;
  /** Above the eyebrow. */
  picture?: React.ReactNode;
};

/** 404, error and sign-in failure: logo header, a heading, a line, one action. */
export function NoticePage(props: Props) {
  return (
    <PageFrame
      header={
        <SheetHeader
          start={
            <Link href="/" className={LOGO}>
              baby steps
            </Link>
          }
        />
      }
    >
      <main className={`${PAGE_WIDTH} pt-12 pb-20 sm:pt-20`}>
        {props.picture}
        <p className="eyebrow animate-rise">{props.eyebrow}</p>
        <h1 className="mt-3 animate-rise font-display text-heading font-light text-ink text-balance sm:text-display-sm">
          {props.title}
        </h1>
        <p className="mt-6 max-w-120 animate-rise text-body-lg text-ink-muted text-balance">
          {props.children}
        </p>
        <div className="mt-10 animate-rise">{props.action}</div>
      </main>
    </PageFrame>
  );
}
