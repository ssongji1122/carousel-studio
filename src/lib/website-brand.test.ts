import { describe, it, expect } from "vitest";
import {
  parseHtmlMeta,
  extractBrandFonts,
  extractBrandColors,
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
    <h1>정상석 클리커</h1><h2>일상 속 K-라이프스타일</h2>`;
  it("pulls title, description, og fields, and headings", () => {
    const m = parseHtmlMeta(html);
    expect(m.title).toContain("frice");
    expect(m.description).toContain("매거진");
    expect(m.ogImageUrl).toBe("https://frice.kr/og.jpg");
    expect(m.headings).toContain("정상석 클리커");
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
});

describe("extractBrandColors", () => {
  it("drops WordPress/builder default palette colors", () => {
    const css = "a{color:#FF6900}b{color:#2D3536}b2{color:#2D3536}c{color:#FFFFFF}";
    const colors = extractBrandColors(css);
    expect(colors).toContain("#2D3536"); // real brand color survives
    expect(colors).not.toContain("#FF6900"); // gutenberg default removed
    expect(colors).not.toContain("#FFFFFF"); // noise removed
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
