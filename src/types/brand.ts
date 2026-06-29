export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  line: string;
  // Optional extended palette for richer compositions (dark slides, serif
  // numerals, tonal accents). Renderers fall back when absent.
  dark?: string;
  accentDark?: string;
  eucalyptus?: string;
  dusty?: string;
  soot?: string;
}

export interface BrandFonts {
  heading: string;
  body: string;
  mono?: string;
}

export type BrandEvidenceSource =
  | "brand-doc"
  | "website-css"
  | "website-og"
  | "website-image"
  | "instagram-profile"
  | "instagram-feed";

export interface BrandEvidence {
  source: BrandEvidenceSource;
  label: string;
  value: string;
  confidence: number;
}

export interface BrandColorCandidate {
  hex: string;
  sources: BrandEvidenceSource[];
  score: number;
  roleHint?: "primary" | "secondary" | "accent" | "background" | "surface" | "line";
}

export interface BrandFontCandidate {
  family: string;
  sources: BrandEvidenceSource[];
  score: number;
  roleHint?: "heading" | "body" | "mono";
}

export interface BrandTokenDecision {
  value: string;
  source: BrandEvidenceSource;
  confidence: number;
  reason: string;
}

export interface BrandAnalysis {
  evidence: BrandEvidence[];
  colorCandidates: BrandColorCandidate[];
  fontCandidates: BrandFontCandidate[];
  decisions: {
    primaryColor: BrandTokenDecision;
    accentColor: BrandTokenDecision;
    backgroundColor: BrandTokenDecision;
    headingFont: BrandTokenDecision;
    bodyFont: BrandTokenDecision;
  };
  appliedAt: string;
}

export interface BrandVoice {
  ending: string;
  banned: string[];
  keywords: string[];
  language?: BrandLanguage;
}

export interface BrandLanguage {
  preferredPhrases: string[];
  avoidPhrases: string[];
  headlinePatterns: string[];
  writingRules: string[];
  sampleLines: string[];
}

export interface BrandKit {
  description: string;
  metaphor: string;
  character: string;
  emotionalRange: string[];
  visualTone: string[];
  forbiddenDirections: string[];
  repeatLimits: string[];
  assetHints: string[];
}

export interface CustomFont {
  name: string;
  path: string;
}

export interface BrandConfig {
  name: string;
  colors: BrandColors;
  fonts: BrandFonts;
  customFonts: CustomFont[];
  logoPath: string | null;
  styleKeywords: string[];
  voice: BrandVoice;
  kit?: BrandKit;
  analysis?: BrandAnalysis;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_BRAND: BrandConfig = {
  name: "",
  colors: {
    primary: "#1a1a2e",
    secondary: "#16213e",
    accent: "#e94560",
    background: "#ffffff",
    surface: "#f5f5f5",
    line: "#E5E1D8",
  },
  fonts: {
    heading: "Inter",
    body: "Inter",
  },
  customFonts: [],
  logoPath: null,
  styleKeywords: [],
  voice: { ending: "합니다체", banned: [], keywords: [] },
  createdAt: "",
  updatedAt: "",
};
