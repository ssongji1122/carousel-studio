import { getBrand } from "./brand";
import { getCarousel } from "./carousels";
import { getPlan } from "./plans";
import { getActiveProjectId } from "./workspace";
import type { BrandConfig } from "@/types/brand";

// Generation routes must never call getBrand() with an implicit/global scope.
// They resolve the brand from the owning carousel or plan's projectId so output
// always matches the brand the user is actually working in.

export async function resolveActiveBrand(): Promise<BrandConfig> {
  return getBrand(await getActiveProjectId());
}

export async function resolveBrandForCarousel(
  carouselId: string
): Promise<BrandConfig> {
  const carousel = await getCarousel(carouselId);
  const projectId = carousel?.projectId || (await getActiveProjectId());
  return getBrand(projectId);
}

export async function resolveBrandForPlan(planId: string): Promise<BrandConfig> {
  const plan = await getPlan(planId);
  const projectId = plan?.projectId || (await getActiveProjectId());
  return getBrand(projectId);
}
