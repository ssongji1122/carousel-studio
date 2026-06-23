import { describe, it, expect } from "vitest";
import { emptyStructuredSlide } from "@/types/carousel";

describe("emptyStructuredSlide", () => {
  it("defaults role to body and empty text/media", () => {
    const s = emptyStructuredSlide(2);
    expect(s.role).toBe("body");
    expect(s.headline).toBe("");
    expect(s.body).toBe("");
    expect(s.media).toBeNull();
  });
});
