// Relative import with extension, for `node --test`.
import { TOP, polar, round2 } from "./charts.ts";

/** Flower and pie share one box. */
export const BALANCE_VIEW = { size: 280, cx: 140, cy: 140 } as const;

/** LifePie's viewBox: room for flat, wrapped labels. */
export const PIE_BOX = { x: -45, y: 0, width: 370, height: 296 } as const;

/** Reach by level; also the guide rings and pie ring edges. */
export const LEVEL_RADII = [56, 80, 104] as const;

/** Label baseline: top half, and bottom half (glyphs hang inward there). */
export const LABEL_RADIUS = 118;
export const LABEL_RADIUS_FLIPPED = 127;

/** Angle of item `i` of `n`, radians, from twelve o'clock clockwise. */
export function itemAngle(i: number, n: number): number {
  return TOP + ((2 * Math.PI) / n) * i;
}

/** Below the centre line, where a clockwise arc would read upside down. */
export function isFlipped(angle: number): boolean {
  return Math.sin(angle) > 1e-9;
}

/** An arc path centred on `angle` that text reads upright along. */
export function labelArc(angle: number, span: number): string {
  const { cx, cy } = BALANCE_VIEW;
  const flipped = isFlipped(angle);
  const r = flipped ? LABEL_RADIUS_FLIPPED : LABEL_RADIUS;
  const from = polar(cx, cy, r, flipped ? angle + span : angle - span);
  const to = polar(cx, cy, r, flipped ? angle - span : angle + span);
  const large = 2 * span > Math.PI ? 1 : 0;
  const sweep = flipped ? 0 : 1;
  return `M ${round2(from.x)} ${round2(from.y)} A ${r} ${r} 0 ${large} ${sweep} ${round2(to.x)} ${round2(to.y)}`;
}

/** An annular sector between radii r0 < r1 and angles a0 < a1. */
export function ringSector(r0: number, r1: number, a0: number, a1: number): string {
  const { cx, cy } = BALANCE_VIEW;
  const p = (r: number, a: number) => {
    const pt = polar(cx, cy, r, a);
    return `${round2(pt.x)} ${round2(pt.y)}`;
  };
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return [
    `M ${p(r0, a0)}`,
    `L ${p(r1, a0)}`,
    `A ${r1} ${r1} 0 ${large} 1 ${p(r1, a1)}`,
    `L ${p(r0, a1)}`,
    `A ${r0} ${r0} 0 ${large} 0 ${p(r0, a0)}`,
    "Z",
  ].join(" ");
}

/** Unit teardrop: base at the origin, tip at (0, −1), width 0.42. */
export const PETAL_PATH = "M 0 0 C 0.28 -0.2 0.28 -1 0 -1 C -0.28 -1 -0.28 -0.2 0 0 Z";
