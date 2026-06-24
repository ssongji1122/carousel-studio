import { describe, it, expect } from "vitest";
import {
  normalizeHandle,
  parseProfileJson,
  dominantColorsFromRaw,
} from "@/lib/instagram-brand";

describe("normalizeHandle", () => {
  it("strips @, urls, and trailing slashes", () => {
    expect(normalizeHandle("@roseshaker")).toBe("roseshaker");
    expect(normalizeHandle("roseshaker/")).toBe("roseshaker");
    expect(normalizeHandle("https://instagram.com/frice.kr/")).toBe("frice.kr");
    expect(normalizeHandle("  @frice.kr  ")).toBe("frice.kr");
  });
});

describe("parseProfileJson", () => {
  const json = {
    data: {
      user: {
        username: "roseshaker",
        full_name: "로즈쉐이커 | Roseshaker",
        biography: "Unique Branding Studio\n김하리",
        category_name: "Graphic Designer",
        edge_followed_by: { count: 32751 },
        external_url: "https://litt.ly/roseshaker",
        bio_links: [{ title: "Links", url: "https://litt.ly/roseshaker" }],
        profile_pic_url_hd: "https://cdn/pic.jpg",
        edge_owner_to_timeline_media: {
          edges: [
            {
              node: {
                display_url: "https://cdn/1.jpg",
                edge_media_to_caption: { edges: [{ node: { text: "Berry Berry Package" } }] },
              },
            },
          ],
        },
      },
    },
  };

  it("extracts the fields used to build a brand doc", () => {
    const p = parseProfileJson(json);
    expect(p.username).toBe("roseshaker");
    expect(p.fullName).toContain("로즈쉐이커");
    expect(p.category).toBe("Graphic Designer");
    expect(p.followers).toBe(32751);
    expect(p.bioLinks[0].url).toContain("litt.ly");
    expect(p.posts[0].caption).toBe("Berry Berry Package");
    expect(p.posts[0].imageUrl).toBe("https://cdn/1.jpg");
    expect(p.profilePicUrl).toBe("https://cdn/pic.jpg");
  });

  it("throws when the user payload is missing", () => {
    expect(() => parseProfileJson({ data: {} })).toThrow();
  });
});

describe("dominantColorsFromRaw", () => {
  it("returns the most frequent color first as uppercase hex", () => {
    // 3 channels: two pinks, one charcoal → pink dominates
    const px = new Uint8Array([
      247, 215, 221, // pink
      247, 215, 221, // pink
      89, 89, 99, //   charcoal
    ]);
    const colors = dominantColorsFromRaw(px, 3, 4);
    expect(colors[0]).toMatch(/^#[0-9A-F]{6}$/);
    // bucket average of the two pinks lands near #F7D7DD
    expect(colors[0].startsWith("#F")).toBe(true);
  });
});
