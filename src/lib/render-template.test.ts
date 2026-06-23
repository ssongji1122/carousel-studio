import { describe, it, expect } from "vitest";
import { renderSlideHtml } from "@/lib/render-template";
import { STUDIO_SOLUTA_SEED } from "@/lib/brand-seed";

const brand = STUDIO_SOLUTA_SEED;

describe("renderSlideHtml", () => {
  it("renders headline text and brand background", () => {
    const html = renderSlideHtml(
      { role: "hook", headline: "형태가 되는 생각", body: "", media: null },
      brand, "4:5"
    );
    expect(html).toContain("형태가 되는 생각");
    expect(html).toContain("#F5F4F0");
    expect(html).toContain("Cormorant Garamond");
  });
  it("includes an img tag when media present", () => {
    const html = renderSlideHtml(
      { role: "body", headline: "h", body: "b",
        media: { type: "image", src: "assets/x.png", fit: "cover", source: "uploaded" } },
      brand, "4:5"
    );
    expect(html).toContain("<img");
    expect(html).toContain("assets/x.png");
  });
  it("uses body font weight >= 400 (no 300)", () => {
    const html = renderSlideHtml(
      { role: "body", headline: "h", body: "본문", media: null }, brand, "4:5");
    expect(html).not.toMatch(/font-weight:\s*300/);
  });
});
