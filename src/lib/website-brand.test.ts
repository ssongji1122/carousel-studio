import { describe, it, expect } from "vitest";
import {
  parseHtmlMeta,
  extractBrandFonts,
  extractBrandColors,
  selectStylesheets,
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
