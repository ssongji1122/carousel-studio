import { describe, it, expect } from "vitest";
import { wrapSlideHtml } from "@/lib/slide-html";

describe("wrapSlideHtml Pretendard", () => {
  it("injects pretendard CDN when Pretendard family is used", () => {
    const body = `<div style="font-family:'Pretendard Variable',sans-serif">a</div>`;
    const out = wrapSlideHtml(body, "4:5");
    expect(out).toContain("cdn.jsdelivr.net/gh/orioncactus/pretendard");
  });
});
