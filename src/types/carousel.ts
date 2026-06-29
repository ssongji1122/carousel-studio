export type AspectRatio = "1:1" | "4:5" | "9:16";
export type SlideRole = "hook" | "body" | "cta";
// Color scheme of a slide, independent of its layout. Lets a deck mix rich
// brand sections (e.g. a wine-toned quote). Omitted = derived from role.
export type SlideTone = "paper" | "soft" | "dark" | "wine";
export type Channel = "instagram" | "threads";
export type MediaLayout = "framed" | "fullBleed";
export type CharacterScene = "tired" | "rollon" | "patch" | "relieved";
export type CharacterExpression = "tired" | "strained" | "focused" | "relieved";
export type CharacterAction = "notice-fog" | "hold-head" | "use-rollon" | "apply-patch" | "rest";
export type VisionAnalysisStatus = "pending" | "ready" | "failed" | "skipped";
export type VisionProviderName = "mock" | "openai" | "anthropic" | "google" | "local";

export interface VisionExpressionFinding {
  label: string;
  emotion: CharacterExpression;
  visualEvidence: string[];
}

export interface VisionActionFinding {
  label: string;
  action: CharacterAction;
  visualEvidence: string[];
}

export interface VisionCompositionFinding {
  characterPosition: string;
  productPosition: string;
  backgroundStyle: string;
}

export interface VisionCharacterAnalysis {
  id: string;
  provider: VisionProviderName;
  imageHash: string;
  analyzedAt: string;
  characterPresent: boolean;
  characterType: string;
  bodyShape: string;
  faceFeatures: string[];
  expressions: VisionExpressionFinding[];
  actions: VisionActionFinding[];
  props: string[];
  colors: string[];
  composition: VisionCompositionFinding;
  negativeConstraints: string[];
}

export interface CharacterReferenceSignal {
  referenceId: string;
  url?: string;
  name: string;
  palette: string[];
  cues: string[];
}

export interface CharacterFrame {
  id: string;
  label: string;
  scene: CharacterScene;
  expression: CharacterExpression;
  action: CharacterAction;
  visualCues: string[];
  referenceImageIds: string[];
  referenceImageUrls?: string[];
}

export interface CharacterSheet {
  id: string;
  generatedAt: string;
  source: "brand-kit" | "reference-images" | "vision-analysis";
  signals: CharacterReferenceSignal[];
  frames: CharacterFrame[];
}

export interface SlideStyle {
  headingFont?: string;
  bodyFont?: string;
  headlineColor?: string;
  bodyColor?: string;
  itemColor?: string;
  backgroundColor?: string;
  accentColor?: string;
  headlineFontSize?: number;
  bodyFontSize?: number;
  itemFontSize?: number;
  headlineOffsetX?: number;
  headlineOffsetY?: number;
  bodyOffsetX?: number;
  bodyOffsetY?: number;
  itemOffsetX?: number;
  itemOffsetY?: number;
  mediaHeightPct?: number;
  mediaRadius?: number;
  mediaScalePct?: number;
  mediaObjectX?: number;
  mediaObjectY?: number;
  mediaLayout?: MediaLayout;
  characterScene?: CharacterScene;
  characterFrameId?: string;
}

export interface MediaRef {
  type: "image" | "video";
  src: string;
  fit: "cover" | "contain";
  source: "generated" | "uploaded";
  provider?: string;
  prompt?: string;
}

export interface Slide {
  id: string;
  html: string;
  previousVersions: string[];
  order: number;
  notes: string;
  role: SlideRole;
  headline: string;
  body: string;
  items: string[];
  media: MediaRef | null;
  tone?: SlideTone;
  style?: SlideStyle;
}

export interface ReferenceImage {
  id: string;
  url: string;       // e.g. "/uploads/abc.png"
  absPath: string;    // absolute path for Claude to Read
  name: string;       // original filename or description
  addedAt: string;
  palette?: string[]; // dominant + accent colors extracted from the image
  characterSignals?: CharacterReferenceSignal[];
  imageHash?: string;
  visionAnalysisStatus?: VisionAnalysisStatus;
  visionAnalysisId?: string;
  visionProvider?: VisionProviderName;
  visionAnalyzedAt?: string;
  visionAnalysisError?: string;
  visionAnalysis?: VisionCharacterAnalysis;
}

export interface Carousel {
  id: string;
  projectId: string;
  brandId?: string;
  name: string;
  aspectRatio: AspectRatio;
  channel: Channel;
  slides: Slide[];
  referenceImages: ReferenceImage[];
  characterSheet?: CharacterSheet;
  caption?: string;
  hashtags?: string[];
  chatSessionId: string | null;
  isTemplate: boolean;
  tags: string[];
  quality?: CarouselQualityReport;
  createdAt: string;
  updatedAt: string;
}

export type QualitySeverity = "error" | "warning";

export interface QualityIssue {
  severity: QualitySeverity;
  code: string;
  message: string;
  slideId?: string;
  slideOrder?: number;
  duplicateSlideId?: string;
}

export interface CarouselQualityReport {
  ok: boolean;
  issues: QualityIssue[];
  mediaSlides: number;
  uniqueMedia: number;
  requiredMediaSlides: number;
}

export function emptyStructuredSlide(order: number): {
  role: SlideRole;
  headline: string;
  body: string;
  items: string[];
  media: MediaRef | null;
  order: number;
  style?: SlideStyle;
} {
  return { role: "body", headline: "", body: "", items: [], media: null, order };
}

export interface CarouselsData {
  carousels: Carousel[];
}

export const DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  "1:1": { width: 1080, height: 1080 },
  "4:5": { width: 1080, height: 1350 },
  "9:16": { width: 1080, height: 1920 },
};

export const MAX_SLIDES = 20;
export const MAX_VERSIONS = 5;
