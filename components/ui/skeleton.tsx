type Props = {
  className?: string;
};

/** Placeholder block. The container carries `role="status"`, not each block. */
export function Skeleton(props: Props) {
  return (
    <div className={`animate-pulse rounded-lg bg-secondary ${props.className ?? ""}`} />
  );
}
