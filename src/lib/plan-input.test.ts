import { describe, it, expect } from "vitest";
import { validateBrief, clampCount, validateItem } from "@/lib/plan-input";

describe("plan-input", () => {
  it("validateBrief requires non-empty scope and target", () => {
    expect(validateBrief({ scope: "s", target: "t" })).toEqual({ scope: "s", target: "t" });
    expect(validateBrief({ scope: "", target: "t" })).toBeNull();
    expect(validateBrief({ scope: "s" })).toBeNull();
    expect(validateBrief("x")).toBeNull();
  });
  it("clampCount clamps to 1..12 with default 6", () => {
    expect(clampCount(undefined)).toBe(6);
    expect(clampCount(0)).toBe(1);
    expect(clampCount(99)).toBe(12);
    expect(clampCount(4)).toBe(4);
    expect(clampCount("3")).toBe(3);
  });
  it("validateItem requires pillar and topic strings", () => {
    expect(validateItem({ pillar: "교육", topic: "x" })).toEqual({ pillar: "교육", topic: "x" });
    expect(validateItem({ pillar: "", topic: "x" })).toBeNull();
    expect(validateItem({ topic: "x" })).toBeNull();
  });
});
