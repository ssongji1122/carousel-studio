import { describe, expect, it } from "vitest";
import { normalizeSlideStyle } from "@/lib/slide-style";

describe("normalizeSlideStyle", () => {
  it("normalizes allowed colors, fonts, and numeric media controls", () => {
    expect(
      normalizeSlideStyle({
        headingFont: " Pretendard ",
        bodyFont: "Noto Sans KR",
        backgroundColor: "#abc",
        headlineColor: "#123456",
        bodyColor: "#0057c2",
        itemColor: "#111111",
        accentColor: "#2f855a",
        headlineFontSize: 200,
        bodyFontSize: 4,
        itemFontSize: 90,
        headlineOffsetX: -999,
        headlineOffsetY: 999,
        bodyOffsetX: 120,
        bodyOffsetY: -140,
        itemOffsetX: 99,
        itemOffsetY: -99,
        mediaHeightPct: 99,
        mediaRadius: -10,
        mediaScalePct: 220,
        mediaObjectX: -20,
        mediaObjectY: 140,
        mediaLayout: "fullBleed",
        characterScene: "rollon",
        characterFrameId: " use-rollon ",
      })
    ).toEqual({
      headingFont: "Pretendard",
      bodyFont: "Noto Sans KR",
      backgroundColor: "#AABBCC",
      headlineColor: "#123456",
      bodyColor: "#0057C2",
      itemColor: "#111111",
      accentColor: "#2F855A",
      headlineFontSize: 140,
      bodyFontSize: 16,
      itemFontSize: 80,
      headlineOffsetX: -360,
      headlineOffsetY: 360,
      bodyOffsetX: 120,
      bodyOffsetY: -140,
      itemOffsetX: 99,
      itemOffsetY: -99,
      mediaHeightPct: 72,
      mediaRadius: 0,
      mediaScalePct: 180,
      mediaObjectX: 0,
      mediaObjectY: 100,
      mediaLayout: "fullBleed",
      characterScene: "rollon",
      characterFrameId: "use-rollon",
    });
  });

  it("merges with fallback and removes keys sent as null", () => {
    expect(
      normalizeSlideStyle(
        { headingFont: null, mediaHeightPct: 44, mediaLayout: null, characterScene: null, characterFrameId: null },
        { headingFont: "Inter", bodyFont: "Pretendard", mediaHeightPct: 60, mediaLayout: "fullBleed", characterScene: "tired", characterFrameId: "tired-hold-head" }
      )
    ).toEqual({ bodyFont: "Pretendard", mediaHeightPct: 44 });
  });
});
