import { SiteFooter } from "./SiteFooter";

type Props = {
  header: React.ReactNode;
  children: React.ReactNode;
  /** Pads the bottom for the phone's fixed nav. */
  bottomNav?: boolean;
};

/** Frame → paper sheet (header + content) → footer on the frame. */
export function PageFrame(props: Props) {
  return (
    <div
      className={`flex-1 bg-frame p-(--frame-pad) ${
        props.bottomNav
          ? "pb-[calc(var(--frame-pad)+var(--bottom-nav-h))] sm:pb-(--frame-pad)"
          : ""
      }`}
    >
      {/* Taller than the window, so the footer starts below the fold. */}
      <div className="flex min-h-[calc(100dvh-2*var(--frame-pad))] flex-col bg-paper shadow-sheet">
        {props.header}
        <div className="flex flex-1 flex-col">{props.children}</div>
      </div>
      <SiteFooter />
    </div>
  );
}
