import { describe, it, expect } from "vitest";
import { wrapSlideHtml, extractFontFamilies } from "@/lib/slide-html";

describe("wrapSlideHtml Pretendard", () => {
  it("injects pretendard CDN when Pretendard family is used", () => {
    const body = `<div style="font-family:'Pretendard Variable',sans-serif">a</div>`;
    const out = wrapSlideHtml(body, "4:5");
    expect(out).toContain("cdn.jsdelivr.net/gh/orioncactus/pretendard");
  });

  it("does not inject remote Pretendard CSS in export mode", () => {
    const body = `<div style="font-family:'Pretendard Variable',sans-serif">a</div>`;
    const out = wrapSlideHtml(body, "4:5", { inlineFontCss: "" });
    expect(out).not.toContain("cdn.jsdelivr.net/gh/orioncactus/pretendard");
  });
});

describe("extractFontFamilies fallback fonts", () => {
  it("captures ALL families in a comma-separated declaration", () => {
    const html = `<div style='font-family:"Cormorant Garamond", "Nanum Myeongjo", serif'>가</div>`;
    const families = extractFontFamilies(html);
    expect(families).toContain("Cormorant Garamond");
    expect(families).toContain("Nanum Myeongjo");
  });
});

describe("wrapSlideHtml Google Fonts request", () => {
  it("requests both heading and Korean fallback fonts", () => {
    const html = `<div style='font-family:"Cormorant Garamond", "Nanum Myeongjo", serif'>가</div>`;
    const out = wrapSlideHtml(html, "4:5");
    expect(out).toContain("Cormorant");
    expect(out).toContain("Nanum");
  });
  it("does not request weight 300 (brand forbids it)", () => {
    const html = `<div style='font-family:"Cormorant Garamond", serif'>a</div>`;
    const out = wrapSlideHtml(html, "4:5");
    expect(out).not.toContain("wght@300");
    expect(out).not.toContain("300;");
  });
});
