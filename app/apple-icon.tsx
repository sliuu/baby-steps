import { ImageResponse } from "next/og";

/**
 * The iOS home-screen tile: the same three stickers, at 180.
 *
 * Drawn in JSX rather than shipped as a PNG because there is no SVG
 * rasteriser in this toolchain and a hand-exported bitmap would drift from
 * `icon.svg` the first time the mark is retuned. This renders once at build
 * time (no request-time APIs, so it is statically optimised) and the numbers
 * below are the only copy of the geometry that has to be kept in step.
 *
 * **Three things differ from `icon.svg`, all on purpose.**
 *
 * It sits on the app's cream rather than on transparency. iOS composites this
 * onto a rounded rect it supplies and does not honour an alpha channel the
 * way a browser tab does; a transparent cut-out becomes a black tile.
 *
 * And it does not carry the dark treatment. A home-screen tile is one image
 * for both appearances, so it gets the light one — which is the readable one
 * on the dark ground iOS would otherwise put behind it.
 *
 * The scale is 4.375: the 32-unit viewBox drawn at 140px, centred in 180 with
 * 20px of margin. Every position below is a coordinate from `icon.svg` put
 * through that one transform, so the two files cannot disagree about the
 * layout — including its deliberate asymmetry, which is the triangle sitting
 * a little low to leave the shadow room.
 *
 * And the shadow is per disc rather than under the group. Satori has no
 * filters, so there is nowhere to put one shadow beneath all three; each disc
 * carries its own. Where the rims cross that shows as a faint seam, and the
 * white cloverleaf the tab mark makes becomes three white circles laid over
 * one another. At 180px that reads as stacked paper and is arguably the
 * better picture; it is only worth knowing that it is a consequence of the
 * renderer, not a second design.
 *
 * Satori has no `stroke`, so the rim is a border on a border-box circle. The
 * arithmetic that makes it the same rim: an SVG stroke straddles the path, so
 * a 3-unit stroke on r 6.7 covers 5.2 to 8.2 — a 16.4-unit outer circle with
 * 3 units of rim and 10.4 units of fill showing. Multiply all three by 4.375.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const OUTER = 71.75; // 16.4 units — the full disc including its rim
const RIM = 13.125; // 3 units — 1.5 rendered pixels, scaled up from the tab

// left/top of each disc's box, not its centre: Satori positions boxes. The
// order is `icon.svg`'s, because these are absolutely positioned and DOM order
// is paint order — the rims cross, so which disc is on top is visible.
const DISCS = [
  { fill: "#e4ada7", left: 54.13, top: 27.22 }, // red, the apex
  { fill: "#a2c2de", left: 24.81, top: 77.97 }, // blue
  { fill: "#aecbae", left: 83.44, top: 77.97 }, // green
];

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        position: "relative",
        width: "100%",
        height: "100%",
        background: "#f7f4ed",
      }}
    >
      {DISCS.map((d) => (
        <div
          key={d.fill}
          style={{
            position: "absolute",
            left: d.left,
            top: d.top,
            width: OUTER,
            height: OUTER,
            borderRadius: OUTER,
            background: d.fill,
            border: `${RIM}px solid #ffffff`,
            boxSizing: "border-box",
            boxShadow: "0 2.4px 5.4px rgba(28, 26, 23, 0.24)",
          }}
        />
      ))}
    </div>,
    { ...size },
  );
}
