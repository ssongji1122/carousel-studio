import { readDataSafe, writeData } from "./data";
import { now } from "./utils";
import type { BrandConfig } from "@/types/brand";
import { POGON_SEED, STUDIO_SOLUTA_SEED, blankBrandTemplate } from "./brand-seed";

// Brands are stored per project in a single map keyed by projectId. This keeps
// each project's brand isolated so one brand's tone never bleeds into another's
// generation. (v1: one brand per project; brandId reserved for later.)
const FILE = "brands.json";

type BrandsData = Record<string, BrandConfig>;

const SEEDED_PROJECTS: Record<string, BrandConfig> = {
  "studio-soluta": STUDIO_SOLUTA_SEED,
  "sample-pogon": POGON_SEED,
  "sample-foggone": POGON_SEED,
};

async function load(): Promise<BrandsData> {
  return readDataSafe<BrandsData>(FILE, {});
}

function cloneBrand(brand: BrandConfig): BrandConfig {
  return JSON.parse(JSON.stringify(brand)) as BrandConfig;
}

function seedFor(projectId: string): BrandConfig {
  const seeded = SEEDED_PROJECTS[projectId];
  return seeded ? cloneBrand(seeded) : blankBrandTemplate();
}

export async function getBrand(projectId: string): Promise<BrandConfig> {
  const data = await load();
  const saved = data[projectId];
  if (saved && isBrandConfigured(saved)) return saved;
  return SEEDED_PROJECTS[projectId] ? seedFor(projectId) : saved ?? seedFor(projectId);
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
