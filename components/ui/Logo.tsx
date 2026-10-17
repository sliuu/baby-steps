/** Flower + wordmark; wrap in an element with `LOGO`. */
export function Logo(props: { label?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.svg" alt="" className="size-7" />
      {props.label ?? "baby steps"}
    </>
  );
}
