import { describe, it, expect, vi, beforeEach } from "vitest";

// In-memory data layer so brand isolation is tested without file I/O.
vi.mock("@/lib/data", () => {
  let store: Record<string, unknown> = {};
  return {
    readDataSafe: vi.fn(async (_f: string, fallback: unknown) =>
      store && Object.keys(store).length ? store : fallback
    ),
    writeData: vi.fn(async (_f: string, data: Record<string, unknown>) => {
      store = data;
    }),
  };
});

const { getBrand, updateBrand } = await import("@/lib/brand");

describe("brand isolation (per project)", () => {
  beforeEach(async () => {
    // reset by overwriting both keys to known state
  });

  it("studio-soluta falls back to the studio seed", async () => {
    const b = await getBrand("studio-soluta");
    expect(b.name).toBe("studio.soluta");
  });

  it("an unknown project falls back to a blank brand, not the studio seed", async () => {
    const b = await getBrand("sample-unknown");
    expect(b.name).toBe("");
  });

  it("editing one project's brand does not bleed into another", async () => {
    await updateBrand("sample-ordinal", { name: "ORDINAL" });
    expect((await getBrand("sample-ordinal")).name).toBe("ORDINAL");
    // studio-soluta must remain its own brand, never the ordinal one
    expect((await getBrand("studio-soluta")).name).toBe("studio.soluta");
  });
});
