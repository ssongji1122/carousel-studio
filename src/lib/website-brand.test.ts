import { describe, it, expect } from "vitest";
import {
  parseHtmlMeta,
  extractBrandFonts,
  extractBrandColors,
  extractWebsiteImageAssets,
  selectStylesheets,
  unwrapInstagramUrl,
  isAggregator,
  parseLittlyLinks,
  pickBestWebsite,
} from "@/lib/website-brand";

describe("parseHtmlMeta", () => {
  const html = `
    <title>frice - 디자이너가 전하는 K-라이프스타일</title>
    <meta name="description" content="한국 문화와 라이프스타일 매거진"/>
    <meta property="og:title" content="frice" />
    <meta property="og:image" content="https://frice.kr/og.jpg" />
    <h1>정상석 클리커</h1><h2>일상 속 K-라이프스타일</h2>
    <p>브랜드가 실제로 쓰는 문장을 가져옵니다.</p>
    <button>오늘의 루틴 보기</button>`;
  it("pulls title, description, og fields, headings, and source copy", () => {
    const m = parseHtmlMeta(html);
    expect(m.title).toContain("frice");
    expect(m.description).toContain("매거진");
    expect(m.ogImageUrl).toBe("https://frice.kr/og.jpg");
    expect(m.headings).toContain("정상석 클리커");
    expect(m.copySnippets).toContain("브랜드가 실제로 쓰는 문장을 가져옵니다.");
    expect(m.copySnippets).toContain("오늘의 루틴 보기");
  });
});

describe("extractWebsiteImageAssets", () => {
  it("keeps OG, image alt text, icons, and background images", () => {
    const html = `
      <meta property="og:image" content="/og.png">
      <link rel="icon" href="/favicon.png">
      <img src="/character.webp" alt="포곤 캐릭터">
      <style>.hero{background-image:url('/hero-bg.jpg')}</style>`;
    const assets = extractWebsiteImageAssets(html, "https://pogon.test/", "/og.png");
    expect(assets).toContainEqual({ url: "https://pogon.test/og.png", source: "og" });
    expect(assets).toContainEqual({ url: "https://pogon.test/character.webp", source: "img", alt: "포곤 캐릭터" });
    expect(assets).toContainEqual({ url: "https://pogon.test/favicon.png", source: "icon" });
    expect(assets).toContainEqual({ url: "https://pogon.test/hero-bg.jpg", source: "background" });
  });
});

describe("extractBrandFonts", () => {
  it("keeps brand fonts and drops system stacks", () => {
    const css = `
      @import url('https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400;700');
      body { font-family: "Libre Franklin", "Helvetica Neue", arial, sans-serif; }
      code { font-family: Menlo, Consolas, monospace; }`;
    const fonts = extractBrandFonts(css);
    expect(fonts).toContain("Libre Franklin");
    expect(fonts).not.toContain("Helvetica Neue");
    expect(fonts).not.toContain("Menlo");
  });

  it("drops emoji and generic display fonts", () => {
    const css = `
      .title { font-family: "Apple Color Emoji", "Pretendard", "Arial Black", sans-serif; }
      body { font-family: "Pretendard", "Apple SD Gothic Neo", sans-serif; }`;
    const fonts = extractBrandFonts(css);
    expect(fonts).toEqual(["Pretendard"]);
  });
});

describe("extractBrandColors", () => {
  it("takes declared brand custom properties, not every incidental hex", () => {
    const css = ":root{--brand-color:#2D3536;--accent-point:#FF8CB4}.sale{background:#FF0000}";
    const colors = extractBrandColors(css);
    expect(colors).toContain("#2D3536"); // declared brand var
    expect(colors).toContain("#FF8CB4"); // declared accent var
    expect(colors).not.toContain("#FF0000"); // incidental shop-chrome red, ignored
  });

  it("reads the theme-color meta and expands shorthand hex", () => {
    const html = '<meta name="theme-color" content="#abc"><style>:root{--main-bg:#1A1B2C}</style>';
    const colors = extractBrandColors(html);
    expect(colors).toContain("#AABBCC"); // #abc expanded
    expect(colors).toContain("#1A1B2C");
  });

  it("drops noise colors even when declared", () => {
    expect(extractBrandColors(":root{--x-color:#FFFFFF}")).not.toContain("#FFFFFF");
  });

  it("keeps repeated vivid brand colors (red/pink), drops one-off hex", () => {
    const css = ".btn{color:#FF1F1F}.link{border:#FF1F1F}.tag{background:#FF8CB4}.t2{color:#FF8CB4}.x{color:#123456}";
    const colors = extractBrandColors(css);
    expect(colors).toContain("#FF1F1F"); // brand red, used twice
    expect(colors).toContain("#FF8CB4"); // brand pink, used twice
    expect(colors).not.toContain("#123456"); // low-saturation one-off, ignored
  });
});

describe("unwrapInstagramUrl", () => {
  it("decodes the u= target of an l.instagram redirect", () => {
    const wrapped = "https://l.instagram.com/?u=https%3A%2F%2Ffrice.kr%2F&e=abc";
    expect(unwrapInstagramUrl(wrapped)).toBe("https://frice.kr/");
  });
  it("passes through a plain url", () => {
    expect(unwrapInstagramUrl("https://roseshaker.com")).toBe("https://roseshaker.com");
  });
});

describe("isAggregator", () => {
  it("flags litt.ly and linktr.ee", () => {
    expect(isAggregator("https://litt.ly/foggone")).toBe(true);
    expect(isAggregator("https://linktr.ee/x")).toBe(true);
    expect(isAggregator("https://frice.kr")).toBe(false);
  });
});

describe("parseLittlyLinks", () => {
  it("extracts outbound links from base64 #data", () => {
    const data = { blocks: [
      { title: "Homepage", url: "https://roseshaker.com" },
      { title: "Contact", link: "https://pf.kakao.com/_x" },
    ] };
    const b64 = Buffer.from(JSON.stringify(data), "utf-8").toString("base64");
    const html = `<x><script id="data" type="text/plain">${b64}</script></x>`;
    const links = parseLittlyLinks(html);
    expect(links).toContain("https://roseshaker.com");
    expect(links).toContain("https://pf.kakao.com/_x");
  });
  it("returns [] when there is no data script", () => {
    expect(parseLittlyLinks("<html></html>")).toEqual([]);
  });
});

describe("pickBestWebsite", () => {
  it("prefers the brand's own domain over marketplaces and socials", () => {
    const best = pickBestWebsite([
      "https://smartstore.naver.com/frice",
      "https://www.museumshop.or.kr/x",
      "https://l.instagram.com/?u=http%3A%2F%2Ffrice.kr%2F&e=1",
      "https://instagram.com/frice.kr",
    ]);
    expect(best).toBe("http://frice.kr/");
  });
  it("drops kakao/social and keeps the homepage", () => {
    expect(pickBestWebsite(["https://roseshaker.com", "https://pf.kakao.com/_x"]))
      .toBe("https://roseshaker.com");
  });
  it("returns null when nothing qualifies", () => {
    expect(pickBestWebsite(["https://instagram.com/x", "https://litt.ly/y"]))
      .toBeNull();
  });
});

describe("selectStylesheets", () => {
  it("prioritizes theme/font CSS and keeps same-origin only", () => {
    const html = `
      <link rel="stylesheet" href="/wp-includes/block-library/style.min.css">
      <link rel="stylesheet" href="/wp-content/themes/frice2024/style.css">
      <link rel="stylesheet" href="https://other.com/x.css">
      <link rel="stylesheet" href="/assets/fonts/font-libre.css">`;
    const sheets = selectStylesheets(html, "https://frice.kr/", 3);
    expect(sheets[0]).toMatch(/theme|font/);
    expect(sheets.some((s) => s.includes("other.com"))).toBe(false);
  });
});
