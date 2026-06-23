import type { BrandConfig } from "@/types/brand";

const BANNED = [
  "혁신적",
  "혁신",
  "융합",
  "솔루션",
  "시너지",
  "패러다임",
  "선도",
  "최고의",
  "차세대",
  "임팩트",
  "스케일",
  "피벗",
];
const KEYWORDS = ["풀어내다", "연결", "흩어진", "형태", "실제로"];

export const STUDIO_SOLUTA_SEED: BrandConfig = {
  name: "studio.soluta",
  colors: {
    primary: "#1A1A18",
    secondary: "#5C5A55",
    accent: "#697C70",
    background: "#F5F4F0",
    surface: "#EEEAE0",
    line: "#E5E1D8",
  },
  fonts: {
    heading: "Cormorant Garamond",
    body: "Pretendard Variable",
    mono: "JetBrains Mono",
  },
  customFonts: [],
  logoPath: null,
  styleKeywords: ["warm paper", "minimal", "editorial", "calm"],
  voice: { ending: "합니다체", banned: BANNED, keywords: KEYWORDS },
  createdAt: "",
  updatedAt: "",
};

export function blankBrandTemplate(): BrandConfig {
  return {
    name: "",
    colors: {
      primary: "#1A1A18",
      secondary: "#5C5A55",
      accent: "#697C70",
      background: "#F5F4F0",
      surface: "#EEEAE0",
      line: "#E5E1D8",
    },
    fonts: {
      heading: "Cormorant Garamond",
      body: "Pretendard Variable",
      mono: "JetBrains Mono",
    },
    customFonts: [],
    logoPath: null,
    styleKeywords: [],
    voice: { ending: "합니다체", banned: BANNED, keywords: [] },
    createdAt: "",
    updatedAt: "",
  };
}
