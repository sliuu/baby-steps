import type { Modifier } from "@dnd-kit/core";
import { getEventCoordinates } from "@dnd-kit/utilities";

/**
 * Centre the overlay on the pointer. dnd-kit anchors it to the source's box,
 * so a small mark lifted from a wide tray row lands far from the cursor.
 * Keyboard drags have no coordinates and are left alone.
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
