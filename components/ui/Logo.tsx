/** Flower + wordmark; wrap in an element with `LOGO`. `markOnly` keeps the name for screen readers. */
export function Logo(props: { label?: string; markOnly?: boolean }) {
  const name = props.label ?? "baby steps";
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.svg" alt="" className="size-6" />
      {props.markOnly ? <span className="sr-only">{name}</span> : name}
    </>
  );
}
