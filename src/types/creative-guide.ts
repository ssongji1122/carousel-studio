export interface StrategyBrief {
  brandName: string;
  audience: string;
  goal: string;
  angle: string;
  coreMessage: string;
  cta: string;
}

export interface CopyGuide {
  ending: string;
  preferredPhrases: string[];
  avoidPhrases: string[];
  headlinePatterns: string[];
  writingRules: string[];
  sampleLines: string[];
  banned: string[];
}

export interface ImageGuide {
  character: string;
  visualTone: string[];
  assetHints: string[];
  forbiddenDirections: string[];
  requiredMediaSlides: number;
  duplicatePolicy: "forbid-same-src" | "allow";
}

export interface SlidePlanItem {
  role: "hook" | "body" | "cta";
  purpose: string;
  mediaRequired: boolean;
  copyIntent: string;
}

export interface SlidePlan {
  slides: SlidePlanItem[];
  minSlides: number;
  maxSlides: number;
}

export interface AssetPlan {
  requiredAssets: string[];
  optionalAssets: string[];
  missingAssetRisks: string[];
}

export interface CreativeGuides {
  strategy: StrategyBrief;
  copy: CopyGuide;
  image: ImageGuide;
  slidePlan: SlidePlan;
  assetPlan: AssetPlan;
}
