import { describe, expect, it } from "vitest";
import { buildCharacterSheet } from "@/lib/character-sheet";
import { POGON_SEED } from "@/lib/brand-seed";
import type { ReferenceImage } from "@/types/carousel";

function reference(name: string, palette: string[] = []): ReferenceImage {
  return {
    id: name.toLowerCase().replace(/\s+/g, "-"),
    url: `/uploads/${name}.png`,
    absPath: `/tmp/${name}.png`,
    name,
    addedAt: "",
    palette,
  };
}

describe("character sheet", () => {
  it("builds default story frames from a character-led brand", () => {
    const sheet = buildCharacterSheet(POGON_SEED, []);

    expect(sheet.source).toBe("brand-kit");
    expect(JSON.stringify(sheet)).not.toMatch(/studio\.soluta/i);
    expect(sheet.frames.map((frame) => frame.id)).toEqual([
      "tired-hold-head",
      "notice-fog",
      "use-rollon",
      "apply-patch",
      "relieved-rest",
    ]);
  });

  it("links reference image cues to matching action frames", () => {
    const sheet = buildCharacterSheet(POGON_SEED, [
      reference("pogon rollon character blue", ["#CBEEFA", "#01419E"]),
      reference("brain point patch package", ["#FEE578"]),
    ]);

    expect(sheet.source).toBe("reference-images");
    expect(sheet.signals.length).toBe(2);
    expect(sheet.frames.find((frame) => frame.id === "use-rollon")?.referenceImageIds).toContain("pogon-rollon-character-blue");
    expect(sheet.frames.find((frame) => frame.id === "apply-patch")?.referenceImageIds).toContain("brain-point-patch-package");
  });

  it("prefers ready vision analysis over filename heuristics", () => {
    const ref = reference("plain upload", ["#CBEEFA"]);
    ref.visionAnalysisStatus = "ready";
    ref.visionAnalysis = {
      id: "analysis-1",
      provider: "mock",
      imageHash: "hash",
      analyzedAt: "",
      characterPresent: true,
      characterType: "크림색 구름형 캐릭터",
      bodyShape: "둥근 구름형 실루엣",
      faceFeatures: ["내려간 입"],
      expressions: [
        {
          label: "피곤한 표정",
          emotion: "tired",
          visualEvidence: ["눈이 작고 입이 아래로 휘어져 있습니다."],
        },
      ],
      actions: [
        {
          label: "롤온 사용",
          action: "use-rollon",
          visualEvidence: ["손 옆에 롤온 제품이 있습니다."],
        },
      ],
      props: ["롤온"],
      colors: ["#CBEEFA"],
      composition: {
        characterPosition: "center",
        productPosition: "near-character",
        backgroundStyle: "soft blue",
      },
      negativeConstraints: [],
    };

    const sheet = buildCharacterSheet(POGON_SEED, [ref]);

    expect(sheet.source).toBe("vision-analysis");
    expect(sheet.frames.find((frame) => frame.id === "use-rollon")?.referenceImageIds).toContain("plain-upload");
    expect(sheet.signals[0].cues).toContain("손 옆에 롤온 제품이 있습니다.");
  });
});
