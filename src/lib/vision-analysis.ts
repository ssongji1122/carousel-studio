import { createHash } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import type { BrandConfig } from "@/types/brand";
import type {
  ReferenceImage,
  VisionCharacterAnalysis,
  VisionProviderName,
} from "@/types/carousel";
import { generateId, now } from "@/lib/utils";

export interface VisionReferenceInput {
  image: ReferenceImage;
  brand: BrandConfig;
}

export interface VisionReferenceProvider {
  name: VisionProviderName;
  analyzeCharacterReference(input: VisionReferenceInput): Promise<VisionCharacterAnalysis>;
}

export async function analyzeReferenceImageWithVision(
  input: VisionReferenceInput,
  provider: VisionReferenceProvider = mockVisionProvider
): Promise<ReferenceImage> {
  const imageHash = await hashFile(input.image.absPath);
  if (
    input.image.visionAnalysisStatus === "ready" &&
    input.image.imageHash === imageHash &&
    input.image.visionAnalysis
  ) {
    return input.image;
  }

  try {
    const analysis = await provider.analyzeCharacterReference({
      ...input,
      image: { ...input.image, imageHash },
    });
    return {
      ...input.image,
      imageHash,
      visionAnalysisStatus: "ready",
      visionAnalysisId: analysis.id,
      visionProvider: provider.name,
      visionAnalyzedAt: analysis.analyzedAt,
      visionAnalysisError: undefined,
      visionAnalysis: analysis,
    };
  } catch (error) {
    return {
      ...input.image,
      imageHash,
      visionAnalysisStatus: "failed",
      visionProvider: provider.name,
      visionAnalyzedAt: now(),
      visionAnalysisError: error instanceof Error ? error.message : "Vision analysis failed",
    };
  }
}

export const mockVisionProvider: VisionReferenceProvider = {
  name: "mock",
  async analyzeCharacterReference({ image, brand }) {
    const metadata = await sharp(image.absPath).metadata().catch(() => null);
    const text = `${image.name} ${image.url} ${brand.kit?.character ?? ""}`.toLowerCase();
    const hasRollon = /roll|롤온|stick|스틱/.test(text);
    const hasPatch = /patch|패치|point/.test(text);
    const hasTired = /tired|피곤|fog|포그|머리|멍|두통/.test(text);
    const hasPackage = /package|box|패키지|제품/.test(text);
    const characterPresent = /character|캐릭터|포곤|foggone|구름/.test(text) || hasRollon || hasPatch;

    const actions = [
      ...(hasRollon ? [{
        label: "롤온 사용",
        action: "use-rollon" as const,
        visualEvidence: ["롤온 또는 스틱 단서가 레퍼런스 이름/맥락에 있습니다."],
      }] : []),
      ...(hasPatch ? [{
        label: "패치 사용",
        action: "apply-patch" as const,
        visualEvidence: ["패치 또는 포인트 단서가 레퍼런스 이름/맥락에 있습니다."],
      }] : []),
      ...(hasTired ? [{
        label: "머리 주변 피로",
        action: "hold-head" as const,
        visualEvidence: ["머리, 피곤함, 포그 단서가 레퍼런스 이름/맥락에 있습니다."],
      }] : []),
      ...(!hasRollon && !hasPatch && !hasTired ? [{
        label: "흐림 인지",
        action: "notice-fog" as const,
        visualEvidence: ["명시적 제품 동작이 없어 캐릭터 상태 인지 장면으로 분류합니다."],
      }] : []),
    ];

    return {
      id: generateId(),
      provider: "mock",
      imageHash: image.imageHash ?? await hashFile(image.absPath),
      analyzedAt: now(),
      characterPresent,
      characterType: characterPresent ? "크림색 구름형 캐릭터" : "unknown",
      bodyShape: characterPresent ? "둥근 구름형 실루엣" : "unknown",
      faceFeatures: hasTired
        ? ["작은 눈", "내려간 입", "머리 주변 물결선"]
        : ["단순한 눈", "짧은 입"],
      expressions: [
        {
          label: hasTired ? "피곤한 표정" : "차분한 표정",
          emotion: hasTired ? "tired" : "focused",
          visualEvidence: hasTired
            ? ["피곤함과 머리 주변 상태 단서가 있습니다."]
            : ["제품 또는 캐릭터 중심 단서가 있습니다."],
        },
      ],
      actions,
      props: [
        ...(hasRollon ? ["롤온"] : []),
        ...(hasPatch ? ["패치"] : []),
        ...(hasPackage ? ["패키지"] : []),
      ],
      colors: image.palette ?? [],
      composition: {
        characterPosition: "center",
        productPosition: hasRollon || hasPatch || hasPackage ? "near-character" : "none",
        backgroundStyle: metadata?.width && metadata?.height
          ? `${metadata.width}x${metadata.height} reference`
          : "unknown",
      },
      negativeConstraints: [
        "고양이 캐릭터로 바꾸지 않습니다.",
        "실타래 메타포를 쓰지 않습니다.",
        "텍스트 카드만으로 처리하지 않습니다.",
      ],
    };
  },
};

export const openaiVisionProvider: VisionReferenceProvider = {
  name: "openai",
  async analyzeCharacterReference({ image, brand }) {
    assertPaidVisionEnabled();
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required for OpenAI vision analysis");
    }
    const model = process.env.OPENAI_VISION_MODEL;
    if (!model) {
      throw new Error("OPENAI_VISION_MODEL is required for OpenAI vision analysis");
    }

    const imageHash = image.imageHash ?? await hashFile(image.absPath);
    const dataUrl = await imageDataUrl(image.absPath);
    const schemaPrompt = buildVisionPrompt(brand.name);
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: schemaPrompt },
              { type: "input_image", image_url: dataUrl },
            ],
          },
        ],
        max_output_tokens: 1200,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI vision failed: ${response.status} ${await response.text()}`);
    }

    const payload = await response.json();
    const text = extractOutputText(payload);
    const parsed = parseVisionJson(text);
    return normalizeOpenAiVisionAnalysis(parsed, {
      imageHash,
      palette: image.palette ?? [],
    });
  },
};

export function resolveVisionProvider(name: VisionProviderName): VisionReferenceProvider {
  if (name === "mock") return mockVisionProvider;
  if (name === "openai") return openaiVisionProvider;
  throw new Error(`Vision provider is not configured: ${name}`);
}

async function hashFile(absPath: string): Promise<string> {
  const buffer = await readFile(absPath);
  return createHash("sha256").update(buffer).digest("hex");
}

function assertPaidVisionEnabled(): void {
  if (process.env.ALLOW_PAID_VISION !== "1") {
    throw new Error("Set ALLOW_PAID_VISION=1 to enable paid Vision API calls");
  }
}

async function imageDataUrl(absPath: string): Promise<string> {
  const buffer = await readFile(absPath);
  return `data:${mimeFromPath(absPath)};base64,${buffer.toString("base64")}`;
}

function mimeFromPath(absPath: string): string {
  const ext = path.extname(absPath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/png";
}

function buildVisionPrompt(brandName: string): string {
  return `Analyze this reference image for ${brandName} carousel character direction.
Return only valid JSON. Do not include markdown.
Schema:
{
  "characterPresent": boolean,
  "characterType": string,
  "bodyShape": string,
  "faceFeatures": string[],
  "expressions": [{"label": string, "emotion": "tired"|"strained"|"focused"|"relieved", "visualEvidence": string[]}],
  "actions": [{"label": string, "action": "hold-head"|"notice-fog"|"use-rollon"|"apply-patch"|"rest", "visualEvidence": string[]}],
  "props": string[],
  "colors": string[],
  "composition": {"characterPosition": string, "productPosition": string, "backgroundStyle": string},
  "negativeConstraints": string[]
}
Focus on visible evidence: eyes, mouth, pose, hand position, product position, motion lines, and background.`;
}

function extractOutputText(payload: unknown): string {
  if (isRecord(payload) && typeof payload.output_text === "string") {
    return payload.output_text;
  }
  if (isRecord(payload) && Array.isArray(payload.output)) {
    return payload.output
      .flatMap((item) => isRecord(item) && Array.isArray(item.content) ? item.content : [])
      .map((content) => isRecord(content) && typeof content.text === "string" ? content.text : "")
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

function parseVisionJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  if (!trimmed) throw new Error("OpenAI vision returned no text");
  return JSON.parse(trimmed);
}

function normalizeOpenAiVisionAnalysis(
  value: unknown,
  context: { imageHash: string; palette: string[] }
): VisionCharacterAnalysis {
  if (!isRecord(value)) {
    throw new Error("OpenAI vision returned invalid JSON");
  }
  return {
    id: generateId(),
    provider: "openai",
    imageHash: context.imageHash,
    analyzedAt: now(),
    characterPresent: typeof value.characterPresent === "boolean" ? value.characterPresent : false,
    characterType: stringValue(value.characterType, "unknown"),
    bodyShape: stringValue(value.bodyShape, "unknown"),
    faceFeatures: stringArray(value.faceFeatures),
    expressions: normalizeExpressions(value.expressions),
    actions: normalizeActions(value.actions),
    props: stringArray(value.props),
    colors: stringArray(value.colors, context.palette),
    composition: normalizeComposition(value.composition),
    negativeConstraints: stringArray(value.negativeConstraints),
  };
}

function normalizeExpressions(value: unknown): VisionCharacterAnalysis["expressions"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const emotion = item.emotion;
    if (!["tired", "strained", "focused", "relieved"].includes(String(emotion))) return [];
    return [{
      label: stringValue(item.label, String(emotion)),
      emotion: emotion as VisionCharacterAnalysis["expressions"][number]["emotion"],
      visualEvidence: stringArray(item.visualEvidence),
    }];
  });
}

function normalizeActions(value: unknown): VisionCharacterAnalysis["actions"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const action = item.action;
    if (!["hold-head", "notice-fog", "use-rollon", "apply-patch", "rest"].includes(String(action))) return [];
    return [{
      label: stringValue(item.label, String(action)),
      action: action as VisionCharacterAnalysis["actions"][number]["action"],
      visualEvidence: stringArray(item.visualEvidence),
    }];
  });
}

function normalizeComposition(value: unknown): VisionCharacterAnalysis["composition"] {
  if (!isRecord(value)) {
    return { characterPosition: "unknown", productPosition: "unknown", backgroundStyle: "unknown" };
  }
  return {
    characterPosition: stringValue(value.characterPosition, "unknown"),
    productPosition: stringValue(value.productPosition, "unknown"),
    backgroundStyle: stringValue(value.backgroundStyle, "unknown"),
  };
}

function stringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback;
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
