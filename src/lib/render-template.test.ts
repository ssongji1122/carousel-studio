import { describe, it, expect } from "vitest";
import { renderSlideHtml } from "@/lib/render-template";
import { STUDIO_SOLUTA_SEED, blankBrandTemplate } from "@/lib/brand-seed";

const brand = STUDIO_SOLUTA_SEED;

describe("renderSlideHtml", () => {
  it("renders headline text and brand background", () => {
    const html = renderSlideHtml(
      { role: "hook", headline: "형태가 되는 생각", body: "", items: [], media: null },
      brand, "4:5"
    );
    expect(html).toContain("형태가 되는 생각");
    expect(html).toContain("#F5F4F0");
    // Headline leads with the brand heading font (Cormorant), with Nanum Myeongjo
    // as the Korean serif fallback so the brand face reaches Korean headlines.
    expect(html).toMatch(/data-edit="headline"[^>]*Cormorant Garamond/);
    expect(html).toMatch(/data-edit="headline"[^>]*Nanum Myeongjo/);
    expect(html).toMatch(/font-weight:700/);
  });
  it("includes an img tag when media present", () => {
    const html = renderSlideHtml(
      { role: "body", headline: "h", body: "b", items: [],
        media: { type: "image", src: "assets/x.png", fit: "cover", source: "uploaded" } },
      brand, "4:5"
    );
    expect(html).toContain("<img");
    expect(html).toContain("assets/x.png");
  });
  it("applies slide-level font, color, and media sizing overrides", () => {
    const html = renderSlideHtml(
      {
        role: "hook",
        headline: "브레인 포그가 찾아온 오후",
        body: "포곤 캐릭터와 함께 컨디션을 살핍니다.",
        items: [],
        media: { type: "image", src: "assets/pogon.png", fit: "contain", source: "uploaded" },
        style: {
          headingFont: "Pretendard",
          bodyFont: "Noto Sans KR",
          backgroundColor: "#C7ECF6",
          headlineColor: "#0047A8",
          bodyColor: "#0057C2",
          itemColor: "#111111",
          accentColor: "#2F855A",
          headlineFontSize: 72,
          bodyFontSize: 30,
          headlineOffsetX: 24,
          headlineOffsetY: -16,
          bodyOffsetX: -12,
          bodyOffsetY: 20,
          mediaHeightPct: 64,
          mediaRadius: 12,
          mediaScalePct: 125,
          mediaObjectX: 42,
          mediaObjectY: 58,
        },
      },
      brand,
      "4:5"
    );
    expect(html).toContain("background:#C7ECF6");
    expect(html).toMatch(/data-edit="headline"[^>]*Pretendard/);
    expect(html).toMatch(/data-edit="body"[^>]*Noto Sans KR/);
    expect(html).toContain("color:#0047A8");
    expect(html).toContain("color:#0057C2");
    expect(html).toContain("font-size:72px");
    expect(html).toContain("font-size:30px");
    expect(html).toContain("left:24px;top:-16px");
    expect(html).toContain("left:-12px;top:20px");
    expect(html).toContain("border:1px solid #2F855A");
    expect(html).toContain("height:64%");
    expect(html).toContain("border-radius:12px");
    expect(html).toContain("object-fit:contain");
    expect(html).toContain("object-position:42% 58%");
    expect(html).toContain("transform:scale(1.25)");
    expect(html).toContain("transform-origin:42% 58%");
  });
  it("uses body font weight >= 400 (no 300)", () => {
    const html = renderSlideHtml(
      { role: "body", headline: "h", body: "본문", items: [], media: null }, brand, "4:5");
    expect(html).not.toMatch(/font-weight:\s*300/);
  });
  it("renders a numbered list when items are present", () => {
    const html = renderSlideHtml(
      { role: "body", headline: "3단계", body: "",
        items: ["첫째 항목", "둘째 항목", "셋째 항목"], media: null,
        style: { itemColor: "#123456", itemFontSize: 40, itemOffsetX: 16, itemOffsetY: -8 } },
      brand, "4:5"
    );
    expect(html).toContain("첫째 항목");
    expect(html).toContain("셋째 항목");
    // numbered: zero-padded index marker
    expect(html).toContain("01");
    expect(html).toContain("03");
    expect(html).toContain("color:#123456");
    expect(html).toContain("font-size:40px");
    expect(html).toContain("left:16px;top:-8px");
  });

  it("does not fall back to studio.soluta when the brand name is blank", () => {
    const html = renderSlideHtml(
      { role: "hook", headline: "포곤의 루틴", body: "", items: [], media: null },
      blankBrandTemplate(),
      "4:5"
    );
    expect(html).toContain("포곤의 루틴");
    expect(html).not.toContain("studio.soluta");
    expect(html).not.toContain("STUDIO.SOLUTA");
  });

  it("does not add automatic brand labels as slide annotations", () => {
    const html = renderSlideHtml(
      {
        role: "hook",
        headline: "브레인 포그가 찾아온 오후",
        body: "포곤 캐릭터와 함께 컨디션을 살핍니다.",
        items: [],
        media: { type: "image", src: "assets/pogon.png", fit: "cover", source: "uploaded" },
      },
      { ...brand, name: "포곤" },
      "4:5"
    );
    expect(html).toContain("브레인 포그가 찾아온 오후");
    expect(html).not.toMatch(/>\\s*포곤\\s*</);
  });

  it("renders media as full bleed when selected", () => {
    const html = renderSlideHtml(
      {
        role: "hook",
        headline: "크림색 구름형 캐릭터",
        body: "초록 잎과 파란 물결선으로 지친 머릿속을 보여줍니다.",
        items: [],
        media: { type: "image", src: "assets/full.png", fit: "cover", source: "uploaded" },
        style: {
          mediaLayout: "fullBleed",
          mediaScalePct: 140,
          mediaObjectX: 32,
          mediaObjectY: 44,
        },
      },
      brand,
      "1:1"
    );
    expect(html).toContain('data-edit="media" style="position:absolute;inset:0');
    expect(html).not.toContain("height:56%;flex:none");
    expect(html).toContain("object-position:32% 44%");
    expect(html).toContain("transform:scale(1.4)");
    expect(html).toContain("크림색 구름형 캐릭터");
  });

  it("matches CTA button labels to the slide action", () => {
    const html = renderSlideHtml(
      {
        role: "cta",
        headline: "흐린 오후를 위한 기준으로 저장하세요",
        body: "오늘의 루틴을 한 번 꺼내보세요.",
        items: [],
        media: null,
      },
      brand,
      "4:5"
    );

    expect(html).toContain("저장하기");
    expect(html).not.toContain("자세히 보기");
  });

  it("renders a Pogon character scene from structured slide style", () => {
    const html = renderSlideHtml(
      {
        role: "hook",
        headline: "머리가 무겁고 멍한 오후",
        body: "포곤 캐릭터가 머리 주변의 물결선을 알아차립니다.",
        items: [],
        media: null,
        style: {
          characterScene: "tired",
          backgroundColor: "#FCFEFF",
          accentColor: "#00B8FF",
        },
      },
      brand,
      "4:5"
    );

    expect(html).toContain('data-character-scene="tired"');
    expect(html).toContain("머리가 무겁고 멍한 오후");
    expect(html).toContain("포곤 캐릭터 장면");
    expect(html).toContain("<svg");
    expect(html).not.toContain("<img");
  });

  it("uses a character sheet frame when a slide references characterFrameId", () => {
    const html = renderSlideHtml(
      {
        role: "body",
        headline: "포곤을 천천히 굴립니다",
        body: "캐릭터가 롤온을 잡고 무거운 머리 주변을 돌봅니다.",
        items: [],
        media: null,
        style: {
          characterFrameId: "use-rollon",
        },
      },
      brand,
      "4:5",
      {
        id: "sheet-1",
        generatedAt: "",
        source: "brand-kit",
        signals: [],
        frames: [
          {
            id: "use-rollon",
            label: "포곤 롤온을 쓰는 장면",
            scene: "rollon",
            expression: "focused",
            action: "use-rollon",
            visualCues: ["롤온을 손에 쥡니다."],
            referenceImageIds: [],
          },
        ],
      }
    );

    expect(html).toContain('data-character-frame="use-rollon"');
    expect(html).toContain('data-character-action="use-rollon"');
    expect(html).toContain('data-character-scene="rollon"');
    expect(html).toContain("포곤 롤온을 쓰는 장면");
  });

  it("uses the existing Pogon character asset when a frame has a reference image", () => {
    const html = renderSlideHtml(
      {
        role: "body",
        headline: "포곤을 천천히 굴립니다",
        body: "기존 포곤 캐릭터 이미지로 장면을 구성합니다.",
        items: [],
        media: null,
        style: {
          characterFrameId: "use-rollon",
          mediaScalePct: 120,
          mediaObjectX: 45,
          mediaObjectY: 40,
        },
      },
      { ...brand, name: "포곤" },
      "4:5",
      {
        id: "sheet-1",
        generatedAt: "",
        source: "reference-images",
        signals: [],
        frames: [
          {
            id: "use-rollon",
            label: "포곤 롤온을 쓰는 장면",
            scene: "rollon",
            expression: "focused",
            action: "use-rollon",
            visualCues: ["이미 있는 포곤 캐릭터 자산을 씁니다."],
            referenceImageIds: ["ref-1"],
            referenceImageUrls: ["/uploads/pogon-rollon-character-reference.png"],
          },
        ],
      }
    );

    expect(html).toContain('data-character-frame="use-rollon"');
    expect(html).toContain('<img src="/uploads/pogon-rollon-character-reference.png"');
    expect(html).toContain("object-position:45% 40%");
    expect(html).toContain("transform:scale(1.2)");
    expect(html).not.toContain("<svg");
  });
});
