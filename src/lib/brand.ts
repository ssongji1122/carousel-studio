import { readDataSafe, writeData } from "./data";
import { now } from "./utils";
import type { BrandConfig } from "@/types/brand";
import { STUDIO_SOLUTA_SEED, blankBrandTemplate } from "./brand-seed";

// Brands are stored per project in a single map keyed by projectId. This keeps
// each project's brand isolated so one brand's tone never bleeds into another's
// generation. (v1: one brand per project; brandId reserved for later.)
const FILE = "brands.json";

type BrandsData = Record<string, BrandConfig>;

async function load(): Promise<BrandsData> {
  return readDataSafe<BrandsData>(FILE, {});
}

function seedFor(projectId: string): BrandConfig {
  return projectId === "studio-soluta"
    ? { ...STUDIO_SOLUTA_SEED }
    : blankBrandTemplate();
}

export async function getBrand(projectId: string): Promise<BrandConfig> {
  const data = await load();
  return data[projectId] ?? seedFor(projectId);
}

export async function updateBrand(
  projectId: string,
  updates: Partial<Omit<BrandConfig, "createdAt" | "updatedAt">>
): Promise<BrandConfig> {
  const data = await load();
  const current = data[projectId] ?? seedFor(projectId);
  const updated: BrandConfig = {
    ...current,
    ...updates,
    colors: { ...current.colors, ...updates.colors },
    fonts: { ...current.fonts, ...updates.fonts },
    updatedAt: now(),
    createdAt: current.createdAt || now(),
  };
  data[projectId] = updated;
  await writeData(FILE, data);
  return updated;
}

export function isBrandConfigured(brand: BrandConfig): boolean {
  return brand.name.trim().length > 0;
}
