import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Carousel, CarouselsData } from "@/types/carousel";

// Mock data layer — file I/O must not run in tests
const mockData: { carousels: Carousel[] } = { carousels: [] };

vi.mock("@/lib/data", () => ({
  readDataSafe: vi.fn(async <T>(_file: string, fallback: T): Promise<T> => {
    return mockData as unknown as T;
  }),
  writeData: vi.fn(async (_file: string, data: CarouselsData): Promise<void> => {
    mockData.carousels = data.carousels;
  }),
}));

// Import AFTER mocks are registered
const { createCarousel, updateCarousel } = await import("@/lib/carousels");

describe("createCarousel", () => {
  beforeEach(() => {
    mockData.carousels = [];
  });

  it("defaults channel to instagram", async () => {
    const c = await createCarousel("Test", "4:5");
    expect(c.channel).toBe("instagram");
  });
});

describe("updateCarousel channel patch", () => {
  beforeEach(() => {
    mockData.carousels = [];
  });

  it("accepts channel patch and persists threads", async () => {
    const c = await createCarousel("Test", "4:5");
    const updated = await updateCarousel(c.id, { channel: "threads" });
    expect(updated?.channel).toBe("threads");
  });
});
