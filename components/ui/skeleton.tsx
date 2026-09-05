type Props = {
  /** Size, radius, and anything else that makes this block the right block. */
  className?: string;
};

/**
 * One grey block standing in for something that hasn't arrived yet.
 *
 * Deliberately dumb — a div with a background and a pulse — because the
 * intelligence in a skeleton isn't in the block, it's in the arrangement. A
 * skeleton earns its place by occupying *the same space* the real thing will,
 * so that when the real thing lands nothing below it jumps. That's a fact about
 * the layout it's imitating, so it lives in the imitation, not here.
 *
 * `bg-secondary` rather than a grey: it's the same token the tray uses for a
 * hover band, so the placeholder sits at the surface's own weight in both
 * themes rather than being a light-theme grey that goes muddy in the dark one.
 *
 * `animate-pulse` is Tailwind's own, and it is the one animation in the app
 * that isn't token-driven — deliberately. Every other duration says something
 * about how fast an interface should feel; this one says "still working", and
 * the reduced-motion block flattens it along with everything else.
 *
 * No `aria-hidden` here. The blocks are empty divs and already announce
 * nothing; the *container* is what carries `role="status"`, so a screen reader
 * hears one "Loading your calendar" rather than forty silent shapes.
 */
export function Skeleton(props: Props) {
  return (
    <div className={`animate-pulse rounded-md bg-secondary ${props.className ?? ""}`} />
  );
}
