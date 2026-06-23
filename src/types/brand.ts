export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  line: string;
}

export interface BrandFonts {
  heading: string;
  body: string;
  mono?: string;
}

export interface BrandVoice {
  ending: string;
  banned: string[];
  keywords: string[];
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
