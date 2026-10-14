import type { BrandConfig } from "@/types/brand";
import type {
  CharacterAction,
  CharacterExpression,
  CharacterFrame,
  CharacterReferenceSignal,
  CharacterScene,
  CharacterSheet,
  ReferenceImage,
} from "@/types/carousel";
import { sanitizeToolBrandReferenceList } from "@/lib/brand-text";
import { generateId, now } from "@/lib/utils";

const FRAME_ORDER: Array<{
  id: string;
  label: string;
  scene: CharacterScene;
  expression: CharacterExpression;
  action: CharacterAction;
  cue: string;
}> = [
  {
    id: "tired-hold-head",
    label: "머리가 무겁고 피곤한 장면",
    scene: "tired",
    expression: "tired",
    action: "hold-head",
    cue: "두 손으로 머리 주변을 감싸고 파란 물결선이 보입니다.",
  },
  {
    id: "notice-fog",
    label: "흐림을 알아차리는 장면",
    scene: "tired",
    expression: "strained",
    action: "notice-fog",
    cue: "작은 눈과 내려간 입으로 머릿속이 흐린 상태를 보여줍니다.",
  },
  {
    id: "use-rollon",
    label: "포곤 롤온을 쓰는 장면",
    scene: "rollon",
    expression: "focused",
    action: "use-rollon",
    cue: "캐릭터가 롤온을 잡고 관자놀이 주변을 천천히 굴립니다.",
  },
  {
    id: "apply-patch",
    label: "브레인 포인트 패치를 붙이는 장면",
    scene: "patch",
    expression: "focused",
    action: "apply-patch",
    cue: "이마 쪽에 노란 패치가 보이고 자세가 안정됩니다.",
  },
  {
    id: "relieved-rest",
    label: "조금 편안해진 장면",
    scene: "relieved",
    expression: "relieved",
    action: "rest",
    cue: "표정이 풀리고 물결선 대비가 낮아집니다.",
  },
];

export function buildCharacterSheet(
  brand: BrandConfig,
  referenceImages: ReferenceImage[] = []
): CharacterSheet {
  const visionSignals = referenceImages.flatMap(analyzeVisionReferenceImageForCharacter);
  const heuristicSignals = referenceImages.flatMap(analyzeReferenceImageForCharacter);
  const signals = visionSignals.length > 0 ? visionSignals : heuristicSignals;
  const source = visionSignals.length > 0 ? "vision-analysis" : signals.length > 0 ? "reference-images" : "brand-kit";
  return {
    id: generateId(),
    generatedAt: now(),
    source,
    signals,
    frames: FRAME_ORDER.map((frame) => buildFrame(frame, brand, signals)),
  };
}

export function analyzeVisionReferenceImageForCharacter(
  image: ReferenceImage
): CharacterReferenceSignal[] {
  const analysis = image.visionAnalysis;
  if (image.visionAnalysisStatus !== "ready" || !analysis?.characterPresent) return [];
  const cues = [
    analysis.bodyShape,
    ...analysis.faceFeatures,
    ...analysis.expressions.flatMap((finding) => finding.visualEvidence),
    ...analysis.actions.flatMap((finding) => finding.visualEvidence),
    ...analysis.props.map((prop) => `${prop}을 장면 소품으로 사용합니다.`),
    `캐릭터 위치: ${analysis.composition.characterPosition}`,
    `제품 위치: ${analysis.composition.productPosition}`,
  ].filter((cue) => cue.trim().length > 0);

  return [
    {
      referenceId: image.id,
      url: image.url,
      name: image.name,
      palette: analysis.colors.length > 0 ? analysis.colors : image.palette ?? [],
      cues,
    },
  ];
}

export function analyzeReferenceImageForCharacter(
  image: ReferenceImage
): CharacterReferenceSignal[] {
  const cues = inferCues(`${image.name} ${image.url}`);
  if (cues.length === 0) return [];
  return [
    {
      referenceId: image.id,
      url: image.url,
      name: image.name,
      palette: image.palette ?? [],
      cues,
    },
  ];
}

export function findCharacterFrame(
  sheet: CharacterSheet | undefined,
  frameId: string | undefined
): CharacterFrame | undefined {
  if (!sheet || !frameId) return undefined;
  return sheet.frames.find((frame) => frame.id === frameId);
}

function buildFrame(
  frame: {
    id: string;
    label: string;
    scene: CharacterScene;
    expression: CharacterExpression;
    action: CharacterAction;
    cue: string;
  },
  brand: BrandConfig,
  signals: CharacterReferenceSignal[]
): CharacterFrame {
  const related = signals.filter((signal) => signalMatchesAction(signal, frame.action));
  const sourceSignals = related.length > 0 ? related : signals.slice(0, 1);
  const baseCues = sanitizeToolBrandReferenceList([
    brand.kit?.character,
    frame.cue,
    ...sourceSignals.flatMap((signal) => signal.cues),
  ].filter((cue): cue is string => typeof cue === "string" && cue.trim().length > 0));

  return {
    id: frame.id,
    label: frame.label,
    scene: frame.scene,
    expression: frame.expression,
    action: frame.action,
    visualCues: Array.from(new Set(baseCues)),
    referenceImageIds: sourceSignals.map((signal) => signal.referenceId),
    referenceImageUrls: sourceSignals.flatMap((signal) => signal.url ? [signal.url] : []),
  };
}

function inferCues(value: string): string[] {
  const text = value.toLowerCase();
  const cues: string[] = [];
  if (/(character|캐릭터|구름|포곤|foggone)/i.test(value)) {
    cues.push("포곤 캐릭터 형태를 유지합니다.");
  }
  if (/(roll|롤온|스틱|stick)/i.test(value)) {
    cues.push("롤온 제품을 손에 쥐거나 얼굴 가까이에 둡니다.");
  }
  if (/(patch|패치|point)/i.test(value)) {
    cues.push("이마 또는 머리 주변에 패치를 배치합니다.");
  }
  if (/(tired|피곤|머리|fog|포그|멍|두통)/i.test(value)) {
    cues.push("피곤한 표정과 머리 주변 물결선을 강조합니다.");
  }
  if (/(package|box|패키지|제품)/i.test(value)) {
    cues.push("제품 패키지는 CTA나 마무리 장면에만 보조로 사용합니다.");
  }
  if (text.includes("blue") || text.includes("파랑") || text.includes("블루")) {
    cues.push("파란 계열을 머리 주변 물결선과 배경에 사용합니다.");
  }
  return cues;
}

function signalMatchesAction(
  signal: CharacterReferenceSignal,
  action: CharacterAction
): boolean {
  const text = `${signal.name} ${signal.cues.join(" ")}`.toLowerCase();
  if (action === "use-rollon") return /roll|롤온|스틱|stick|use-rollon/.test(text);
  if (action === "apply-patch") return /patch|패치|point|apply-patch/.test(text);
  if (action === "hold-head" || action === "notice-fog") return /tired|피곤|머리|fog|포그|멍|두통|캐릭터|character/.test(text);
  if (action === "rest") return /package|box|패키지|제품|relieved|편안/.test(text);
  return false;
}
