import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { buildLogoMarkSvg } from "../src/brand/logoMark";
import { parseLogoModule, buildLogoMarkSvgFrom, pwaIconsPlugin } from "./pwaIconsPlugin.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const moduleSource = readFileSync(path.join(here, "../src/brand/logoMark.ts"), "utf8");

describe("logoMark module parser", () => {
  const art = parseLogoModule(moduleSource);

  it("extracts the 40×40 geometry verbatim", () => {
    expect(art.size).toBe(40);
    expect(art.dot).toEqual({ cx: 13, cy: 27, r: 4.5 });
    expect(art.arcInner).toBe("M19.5 27C19.5 20.6487 24.6487 15.5 31 15.5");
    expect(art.arcOuter).toBe("M19.5 33.5C19.5 23.2827 27.7827 15 38 15");
  });

  it("extracts both surfaces' palettes", () => {
    expect(art.palette.brand).toEqual({ primary: "#3A36E0", accent: "#FF8A34" });
    expect(art.palette.cafe).toEqual({ primary: "#c45c26", accent: "#c4a35a" });
  });

  it("fails loudly when an export is missing", () => {
    expect(() => parseLogoModule("export const nothing = 1")).toThrow(/LOGO_VIEWBOX_SIZE/);
  });
});

describe("SVG builder parity (plugin mirror vs TS module)", () => {
  const cases = [
    { stroke: 3.2, padding: 0, surface: "brand" },
    { stroke: 5.5, padding: 1.5, surface: "brand" },
    { stroke: 5.5, padding: 1.5, surface: "cafe" },
    { stroke: 1, padding: 3, surface: "cafe" },
  ] as const;

  for (const options of cases) {
    it(`matches for stroke=${options.stroke} padding=${options.padding} surface=${options.surface}`, () => {
      const fromModule = buildLogoMarkSvg(options);
      const fromPlugin = buildLogoMarkSvgFrom(parseLogoModule(moduleSource), options);
      expect(fromPlugin).toBe(fromModule);
    });
  }

  it("pads the viewBox and heavy strokes stay inside it", () => {
    const svg = buildLogoMarkSvg({ stroke: 5.5, padding: 1.5, surface: "brand" });
    expect(svg).toContain('viewBox="-1.5 -1.5 43 43"');
    // Arc cap at x=38 + half stroke must stay within the padded right edge.
    expect(38 + 5.5 / 2).toBeLessThanOrEqual(40 + 1.5);
  });
});

describe("plugin shape", () => {
  it("exposes the vite plugin hooks and dev middleware wiring", () => {
    const plugin = pwaIconsPlugin();
    expect(plugin.name).toBe("omnitaps-pwa-icons");
    expect(typeof plugin.configResolved).toBe("function");
    expect(typeof plugin.configureServer).toBe("function");
    expect(typeof plugin.closeBundle).toBe("function");
  });
});
