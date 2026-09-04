import type { Modifier } from "@dnd-kit/core";
import { getEventCoordinates } from "@dnd-kit/utilities";

/**
 * Put the middle of the floating mark under the pointer.
 *
 * dnd-kit positions the overlay by copying the *source* element's box —
 * `PositionedOverlay` sets `top`, `left`, `width` and `height` straight from
 * the rect it measured when the drag began — and then translates that box by
 * how far you've moved. That's the right default when the overlay is a copy of
 * what you picked up, because then the copy sits exactly where the original is
 * and grabbing it anywhere feels like grabbing the original there.
 *
 * It stops being right the moment the overlay is *smaller* than what you picked
 * up. A tray row is about 288px wide; the circle we now draw instead is 26. The
 * box is still anchored at the row's left edge, so the circle lands at that
 * edge — and since you almost always grab a row by its name, the mark appears a
 * hand's width to the left of your cursor, over some other part of the page. It
 * reads as nothing having been picked up at all.
 *
 * So the anchor has to move from "wherever the source's corner was" to "the
 * pointer". The offset is the distance from the overlay's own top-left to where
 * the drag started, less half the overlay, which lands its centre on the
 * pointer and keeps it there for the rest of the drag.
 *
 * A mark lifted off the calendar is already 26px and already grabbed near its
 * middle, so this shifts it by a pixel or two and nothing else — which is the
 * point. One rule, and the two drags become the same gesture.
 *
 * Keyboard drags return no coordinates and are left alone: there is no pointer
 * to snap to, and dnd-kit is already moving the overlay in whole-cell steps
 * from the source's corner, which is the correct behaviour for that sensor.
 */
export const snapToCursor: Modifier = ({
  activatorEvent,
  draggingNodeRect,
  transform,
}) => {
  if (!activatorEvent || !draggingNodeRect) return transform;

  const grabbed = getEventCoordinates(activatorEvent);
  if (!grabbed) return transform;

  return {
    ...transform,
    x: transform.x + grabbed.x - draggingNodeRect.left - draggingNodeRect.width / 2,
    y: transform.y + grabbed.y - draggingNodeRect.top - draggingNodeRect.height / 2,
  };
};
