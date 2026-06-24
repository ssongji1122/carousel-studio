import { describe, it, expect } from "vitest";
import { buildBrandDoc } from "@/lib/brand-doc";
import type { IgProfile } from "@/lib/instagram-brand";
import type { WebSignals } from "@/lib/website-brand";

const profile: IgProfile = {
  username: "frice.kr",
  fullName: "frice 프라이스",
  biography: "K-Culture & Lifestyle",
  category: null,
  followers: 3286,
  externalUrl: "http://frice.kr",
  bioLinks: [],
  profilePicUrl: null,
  posts: [{ caption: "정상석 클리커", imageUrl: null }],
};

const web: WebSignals = {
  url: "https://frice.kr",
  title: "frice 매거진",
  description: "한국 문화 라이프스타일",
  ogTitle: "frice",
  ogDescription: "디자이너가 전하는 K-라이프스타일",
  ogImageUrl: "https://frice.kr/og.jpg",
  headings: ["정상석 클리커"],
  fonts: ["Libre Franklin", "Pretendard"],
  cssColors: ["#2D3536"],
  ogPalette: ["#1D211A", "#E0DAD4"],
};

describe("buildBrandDoc", () => {
  it("instagram-only doc carries palette + 11-key fill guidance", () => {
    const doc = buildBrandDoc({ ig: { profile, palette: ["#1D211A", "#E0DAD4"] } });
    expect(doc).toContain("@frice.kr");
    expect(doc).toContain("인스타 피드 팔레트");
    expect(doc).toContain("#1D211A");
    expect(doc).toContain("11개 키");
    expect(doc).toContain("정상석 클리커");
  });

  it("website signals contribute real fonts and og palette", () => {
    const doc = buildBrandDoc({ web });
    expect(doc).toContain("실제로 사용하는 폰트");
    expect(doc).toContain("Libre Franklin");
    expect(doc).toContain("웹 OG 이미지 팔레트");
    expect(doc).toContain("#1D211A");
  });

  it("combines both sources into one document", () => {
    const doc = buildBrandDoc({ ig: { profile, palette: ["#040404"] }, web });
    expect(doc).toContain("Instagram @frice.kr");
    expect(doc).toContain("웹사이트 https://frice.kr");
    expect(doc).toContain("Libre Franklin"); // web font wins over IG mood guess
    expect(doc).toContain("(IG) 정상석 클리커");
    expect(doc).toContain("(웹) 정상석 클리커");
  });
});
