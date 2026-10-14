import { describe, expect, it } from "vitest";
import {
  EXTERNAL_SKILLPACKS,
  groupSkillpacksByStage,
  listExternalSkillpacks,
  validateSkillpackRegistry,
} from "@/lib/external-skillpacks";

describe("external skillpacks registry", () => {
  it("has valid metadata and blocks AGPL runtime dependencies by default", () => {
    expect(validateSkillpackRegistry()).toEqual([]);
    expect(EXTERNAL_SKILLPACKS.every((pack) => pack.license.trim())).toBe(true);

    const firecrawl = EXTERNAL_SKILLPACKS.find((pack) => pack.id === "firecrawl");
    expect(firecrawl?.license).toContain("AGPL");
    expect(firecrawl?.enabledByDefault).toBe(false);
    expect(firecrawl?.integrationMode).toBe("blocked-runtime");
  });

  it("groups reusable guidance by pipeline stage", () => {
    const grouped = groupSkillpacksByStage();

    expect(grouped["brand-analysis"].map((pack) => pack.id)).toContain("dembrandt");
    expect(grouped["strategy-brief"].map((pack) => pack.id)).toContain("marketingskills");
    expect(grouped["copy-guide"].map((pack) => pack.id)).toContain("marketingskills-copywriting");
    expect(grouped["quality-gate"].map((pack) => pack.id)).toContain("promptfoo");
  });

  it("filters by stage", () => {
    expect(listExternalSkillpacks("reference-intake").map((pack) => pack.id)).toEqual(
      expect.arrayContaining(["markitdown", "docling", "crawl4ai", "firecrawl"])
    );
  });
});
