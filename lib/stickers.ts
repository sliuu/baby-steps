/**
 * Everything needed to *draw* a sticker, and nothing else.
 *
 * Two different rows in the database end up as a circle on screen: an activity
 * you own (in the tray) and a placement of one on a day (on the grid). They
 * carry different ids and mean different things, but they look identical, so
 * StickerMark asks for this and neither the tray nor the grid needs its own
 * version of the component.
 */
export type StickerFace = {
  name: string;
  /** One grapheme — a letter or an emoji. */
  mark: string;
  colorKey: string;
};
