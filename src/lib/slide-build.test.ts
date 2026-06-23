import { describe, it, expect } from "vitest";
import { buildSlideFromStructured } from "@/lib/slide-build";
import { STUDIO_SOLUTA_SEED } from "@/lib/brand-seed";

describe("buildSlideFromStructured", () => {
  it("renders html and reports clean voice", () => {
    const r = buildSlideFromStructured(
      { role: "hook", headline: "형태가 되는 생각", body: "" },
      STUDIO_SOLUTA_SEED, "4:5");
    expect(r.html).toContain("형태가 되는 생각");
    expect(r.violations).toHaveLength(0);
  });
  it("reports banned word violation", () => {
    const r = buildSlideFromStructured(
      { role: "body", headline: "혁신적 접근", body: "" },
      STUDIO_SOLUTA_SEED, "4:5");
    expect(r.violations.some((x) => x.kind === "banned")).toBe(true);
  });
});
