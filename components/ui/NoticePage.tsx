import Link from "next/link";

import { PageFrame } from "./PageFrame";

type Props = {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  /** The one way on. */
  action: React.ReactNode;
  /** Above the eyebrow. */
  picture?: React.ReactNode;
};

/** 404, error and sign-in failure: logo header, a heading, a line, one action. */
export function NoticePage(props: Props) {
  return (
    <PageFrame
      header={
        <header className="flex h-16 items-center border-b border-rule-strong px-5 lg:px-10">
          <Link href="/" className="font-heading text-subhead text-accent-ink">
            baby steps
          </Link>
        </header>
      }
    >
      <main className="w-full max-w-180 px-5 pt-12 pb-20 sm:pt-24 lg:px-10">
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
