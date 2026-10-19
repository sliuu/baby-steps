import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// iOS tile: icon.svg on paper (iOS blacks out transparency).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const raw = readFileSync(join(process.cwd(), "app/icon.svg"), "utf8");
  // Satori can't resolve var(); inline the light values.
  const light = Object.fromEntries(
    [...raw.slice(0, raw.indexOf("@media")).matchAll(/(--[a-z]+):\s*(#[0-9A-Fa-f]+)/g)].map((m) => [m[1], m[2]]),
  );
  const svg = raw.replace(/var\((--[a-z]+)\)/g, (_, name: string) => light[name]);
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#FFFEF5" }}>
      <img src={src} width={140} height={140} alt="" />
    </div>,
    { ...size },
  );
}
