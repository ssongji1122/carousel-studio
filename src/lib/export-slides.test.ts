import { afterEach, describe, expect, it, vi } from "vitest";
import { inlineImages } from "@/lib/export-slides";

describe("inlineImages", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("inlines remote images once and replaces every occurrence", async () => {
    const url = "https://cdn.example.com/pogon.png?w=800";
    const fetchMock = vi.fn(async () =>
      new Response(Buffer.from([1, 2, 3]), {
        status: 200,
        headers: { "content-type": "image/png" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const html = `<img src="${url}" /><div style="background-image:url('${url}')"></div>`;
    const result = await inlineImages(html);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).not.toContain(url);
    expect(result.match(/data:image\/png;base64,AQID/g)).toHaveLength(2);
  });
});
