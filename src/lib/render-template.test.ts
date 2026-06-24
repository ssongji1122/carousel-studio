import { describe, it, expect } from "vitest";
import { renderSlideHtml } from "@/lib/render-template";
import { STUDIO_SOLUTA_SEED } from "@/lib/brand-seed";

const brand = STUDIO_SOLUTA_SEED;

describe("renderSlideHtml", () => {
  it("renders headline text and brand background", () => {
    const html = renderSlideHtml(
      { role: "hook", headline: "형태가 되는 생각", body: "", items: [], media: null },
      brand, "4:5"
    );
    expect(html).toContain("형태가 되는 생각");
    expect(html).toContain("#F5F4F0");
    // Headline leads with the brand heading font (Cormorant), with Nanum Myeongjo
    // as the Korean serif fallback so the brand face reaches Korean headlines.
    expect(html).toMatch(/data-edit="headline"[^>]*Cormorant Garamond/);
    expect(html).toMatch(/data-edit="headline"[^>]*Nanum Myeongjo/);
    expect(html).toMatch(/font-weight:700/);
  });
  it("includes an img tag when media present", () => {
    const html = renderSlideHtml(
      { role: "body", headline: "h", body: "b", items: [],
        media: { type: "image", src: "assets/x.png", fit: "cover", source: "uploaded" } },
      brand, "4:5"
    );
    expect(html).toContain("<img");
    expect(html).toContain("assets/x.png");
  });
  it("uses body font weight >= 400 (no 300)", () => {
    const html = renderSlideHtml(
      { role: "body", headline: "h", body: "본문", items: [], media: null }, brand, "4:5");
    expect(html).not.toMatch(/font-weight:\s*300/);
  });
  it("renders a numbered list when items are present", () => {
    const html = renderSlideHtml(
      { role: "body", headline: "3단계", body: "",
        items: ["첫째 항목", "둘째 항목", "셋째 항목"], media: null },
      brand, "4:5"
    );
    expect(html).toContain("첫째 항목");
    expect(html).toContain("셋째 항목");
    // numbered: zero-padded index marker
    expect(html).toContain("01");
    expect(html).toContain("03");
  });
});
