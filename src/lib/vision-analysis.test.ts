import { mkdtemp, rm } from "fs/promises";
import path from "path";
import os from "os";
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POGON_SEED } from "@/lib/brand-seed";
import { analyzeReferenceImageWithVision, openaiVisionProvider } from "@/lib/vision-analysis";
import type { ReferenceImage } from "@/types/carousel";

const originalVisionEnv = {
  ALLOW_PAID_VISION: process.env.ALLOW_PAID_VISION,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_VISION_MODEL: process.env.OPENAI_VISION_MODEL,
};

describe("vision analysis", () => {
  afterEach(() => {
    restoreVisionEnv();
    vi.unstubAllGlobals();
  });

  it("stores a ready mock analysis with an image hash", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "vision-analysis-"));
    const absPath = path.join(dir, "pogon-rollon-character.png");
    await sharp({
      create: {
        width: 120,
        height: 120,
        channels: 4,
        background: "#CBEEFA",
      },
    }).png().toFile(absPath);

    const image: ReferenceImage = {
      id: "ref-1",
      url: "/uploads/pogon-rollon-character.png",
      absPath,
      name: "pogon rollon character",
      addedAt: "",
      palette: ["#CBEEFA"],
      visionAnalysisStatus: "pending",
    };

    const analyzed = await analyzeReferenceImageWithVision({
      image,
      brand: POGON_SEED,
    });

    expect(analyzed.visionAnalysisStatus).toBe("ready");
    expect(analyzed.imageHash).toMatch(/^[a-f0-9]{64}$/);
    expect(analyzed.visionAnalysis?.actions.some((action) => action.action === "use-rollon")).toBe(true);

    await rm(dir, { recursive: true, force: true });
  });

  it("stores a ready OpenAI analysis from structured vision JSON", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "vision-analysis-openai-"));
    const absPath = path.join(dir, "pogon-character-holding-head.png");
    await sharp({
      create: {
        width: 160,
        height: 120,
        channels: 4,
        background: "#D4F0F8",
      },
    }).png().toFile(absPath);

    process.env.ALLOW_PAID_VISION = "1";
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_VISION_MODEL = "test-vision-model";

    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.model).toBe("test-vision-model");
      expect(body.input[0].content[1].image_url).toMatch(/^data:image\/png;base64,/);
      return new Response(JSON.stringify({
        output_text: JSON.stringify({
          characterPresent: true,
          characterType: "크림색 구름형 캐릭터",
          bodyShape: "둥근 구름형 실루엣",
          faceFeatures: ["작은 눈", "내려간 입", "머리 주변 물결선"],
          expressions: [{
            label: "피곤한 표정",
            emotion: "tired",
            visualEvidence: ["눈과 입이 아래로 처져 있습니다."],
          }],
          actions: [{
            label: "머리를 감싸는 장면",
            action: "hold-head",
            visualEvidence: ["손이 머리 주변에 있습니다."],
          }],
          props: ["롤온"],
          colors: ["#D4F0F8", "#F7C9DA"],
          composition: {
            characterPosition: "lower-right",
            productPosition: "near-character",
            backgroundStyle: "soft product photo",
          },
          negativeConstraints: ["고양이 캐릭터로 바꾸지 않습니다."],
        }),
      }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const analyzed = await analyzeReferenceImageWithVision({
      image: referenceImage(absPath, "pogon character holding head"),
      brand: POGON_SEED,
    }, openaiVisionProvider);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(analyzed.visionAnalysisStatus).toBe("ready");
    expect(analyzed.visionProvider).toBe("openai");
    expect(analyzed.visionAnalysis?.expressions[0]?.emotion).toBe("tired");
    expect(analyzed.visionAnalysis?.actions[0]?.action).toBe("hold-head");

    await rm(dir, { recursive: true, force: true });
  });

  it("keeps OpenAI analysis failed until paid Vision is explicitly enabled", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "vision-analysis-guard-"));
    const absPath = path.join(dir, "pogon-character.png");
    await sharp({
      create: {
        width: 80,
        height: 80,
        channels: 4,
        background: "#CBEEFA",
      },
    }).png().toFile(absPath);

    delete process.env.ALLOW_PAID_VISION;
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_VISION_MODEL = "test-vision-model";

    const analyzed = await analyzeReferenceImageWithVision({
      image: referenceImage(absPath, "pogon character"),
      brand: POGON_SEED,
    }, openaiVisionProvider);

    expect(analyzed.visionAnalysisStatus).toBe("failed");
    expect(analyzed.visionProvider).toBe("openai");
    expect(analyzed.visionAnalysisError).toContain("ALLOW_PAID_VISION");

    await rm(dir, { recursive: true, force: true });
  });
});

function referenceImage(absPath: string, name: string): ReferenceImage {
  return {
    id: "ref-1",
    url: `/uploads/${path.basename(absPath)}`,
    absPath,
    name,
    addedAt: "",
    palette: ["#CBEEFA"],
    visionAnalysisStatus: "pending",
  };
}

function restoreVisionEnv(): void {
  for (const [key, value] of Object.entries(originalVisionEnv)) {
    if (typeof value === "string") {
      process.env[key] = value;
    } else {
      delete process.env[key];
    }
  }
}
