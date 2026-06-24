import { describe, it, expect } from "vitest";
import { hexToOklch, oklchToHex, contrastRatio, expandPalette, guardPalette } from "./palette-expand";

const dist = (a: string, b: string) => {
  const pa = a.replace("#", "").match(/../g)!.map((x) => parseInt(x, 16));
  const pb = b.replace("#", "").match(/../g)!.map((x) => parseInt(x, 16));
  return Math.max(...pa.map((v, i) => Math.abs(v - pb[i])));
};

describe("OKLCH conversion", () => {
  it("round-trips hex within a small tolerance", () => {
    for (const hex of ["#B07A2E", "#1A140F", "#F3EEDE", "#5A2330", "#377ADD", "#FFFFFF", "#000000"]) {
      expect(dist(oklchToHex(hexToOklch(hex)), hex)).toBeLessThanOrEqual(2);
    }
  });
});

describe("expandPalette", () => {
  const p = expandPalette("#B07A2E");
  it("produces valid hex for every token", () => {
    for (const v of Object.values(p)) expect(v).toMatch(/^#[0-9A-F]{6}$/);
  });
  it("ink meets WCAG AA on background", () => {
    expect(contrastRatio(p.primary, p.background)).toBeGreaterThanOrEqual(4.5);
  });
  it("accent meets AA-large on background", () => {
    expect(contrastRatio(p.accent, p.background)).toBeGreaterThanOrEqual(3);
  });
  it("background is light, dark is dark", () => {
    expect(contrastRatio(p.background, "#000000")).toBeGreaterThan(15);
    expect(contrastRatio(p.dark!, "#FFFFFF")).toBeGreaterThan(12);
  });
});

describe("guardPalette", () => {
  it("raises low-contrast ink to AA and reports it", () => {
    const { colors, adjusted } = guardPalette({ background: "#FFFFFF", primary: "#999999" });
    expect(contrastRatio(colors.primary, colors.background)).toBeGreaterThanOrEqual(4.5);
    expect(adjusted).toContain("primary");
  });
  it("fills every missing token from the accent seed", () => {
    const { colors } = guardPalette({ accent: "#B07A2E" });
    for (const v of Object.values(colors)) expect(v).toMatch(/^#[0-9A-F]{6}$/);
  });
  it("leaves an already-accessible color untouched", () => {
    const { adjusted } = guardPalette({ background: "#F3EEDE", primary: "#1A140F" });
    expect(adjusted).not.toContain("primary");
  });
});
