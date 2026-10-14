import { describe, expect, it } from "vitest";
import { applyBrandAnalysis, buildBrandAnalysis } from "@/lib/brand-analysis";
import type { BrandConfig } from "@/types/brand";
import type { BrandSources } from "@/lib/brand-doc";
import type { IgProfile } from "@/lib/instagram-brand";
import type { WebSignals } from "@/lib/website-brand";

const brand: BrandConfig = {
  name: "테스트 브랜드",
  colors: {
    primary: "#111111",
    secondary: "#333333",
    accent: "#AA0000",
    background: "#FFFFFF",
    surface: "#F4F4F4",
    line: "#DDDDDD",
  },
  fonts: {
    heading: "Inter",
    body: "Inter",
    mono: "DM Mono",
  },
  customFonts: [],
  logoPath: null,
  styleKeywords: [],
  voice: { ending: "합니다체", banned: [], keywords: [] },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const profile: IgProfile = {
  username: "pogon.kr",
  fullName: "포곤 FOGGONE",
  biography: "머릿속 안개를 천천히 걷어내는 브랜드",
  category: null,
  followers: 1000,
  externalUrl: "https://포곤.com",
  bioLinks: [],
  profilePicUrl: null,
  posts: [{ caption: "브레인 포그가 찾아온 날", imageUrl: null }],
};

const web: WebSignals = {
  url: "https://포곤.com",
  title: "포곤 FOGGONE",
  description: "브레인 포그를 위한 작은 루틴",
  ogTitle: "포곤",
  ogDescription: "흐린 머리를 위한 루틴 세트",
  ogImageUrl: "https://pogon.test/og.png",
  headings: ["머릿속 안개가 찾아온 날"],
  copySnippets: ["오늘의 흐림을 천천히 지나갑니다"],
  imageAssets: [],
  fonts: ["SUIT", "Pretendard"],
  cssColors: ["#405B38", "#F3E9D9", "#9BDA3A"],
  ogPalette: ["#202717", "#FBF7EA", "#6FB33F"],
};

const sources: BrandSources = {
  ig: { profile, palette: ["#182012", "#F6F0E4", "#7FB653"] },
  web,
};

describe("brand analysis", () => {
  it("stores source evidence and token decisions for colors and fonts", () => {
    const analysis = buildBrandAnalysis(sources, brand);

    expect(analysis).not.toBeNull();
    expect(analysis?.evidence.map((entry) => entry.source)).toContain("website-css");
    expect(analysis?.decisions.primaryColor.value).toBe("#182012");
    expect(analysis?.decisions.backgroundColor.value).toBe("#FBF7EA");
    expect(analysis?.decisions.accentColor.value).toBe("#9BDA3A");
    expect(analysis?.decisions.headingFont.value).toBe("SUIT");
    expect(analysis?.decisions.bodyFont.value).toBe("Pretendard");
  });

  it("applies decisions as complete brand colors and fonts", () => {
    const analysis = buildBrandAnalysis(sources, brand);
    if (!analysis) throw new Error("analysis expected");

    const patch = applyBrandAnalysis(brand, analysis);

    expect(patch.colors?.primary).toBe("#182012");
    expect(patch.colors?.accent).toBe("#9BDA3A");
    expect(patch.colors?.background).toBe("#FBF7EA");
    expect(patch.colors?.dark).toBe("#182012");
    expect(patch.colors?.line).toMatch(/^#[0-9A-F]{6}$/);
    expect(patch.fonts?.heading).toBe("SUIT");
    expect(patch.fonts?.body).toBe("Pretendard");
    expect(patch.analysis?.colorCandidates.some((candidate) => candidate.roleHint === "accent")).toBe(true);
  });

  it("falls back to the existing brand when source signals are missing", () => {
    const analysis = buildBrandAnalysis({}, brand);

    expect(analysis).not.toBeNull();
    expect(analysis?.decisions.primaryColor.value).toBe("#111111");
    expect(analysis?.decisions.headingFont.value).toBe("Inter");
  });
});
