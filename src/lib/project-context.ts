import { getBrand, isBrandConfigured } from "@/lib/brand";
import { buildCreativeGuidesFromBrand } from "@/lib/creative-guides";
import { getProjectSourceStatus } from "@/lib/project-sources";
import { getPreset } from "@/lib/style-presets";
import type { BrandConfig, BrandVoice } from "@/types/brand";
import type { CreativeGuides } from "@/types/creative-guide";
import type { ProjectSourceStatus } from "@/types/project-source";
import type { StylePreset } from "@/types/style-preset";

export interface ProjectContext {
  projectId: string;
  brand: BrandConfig;
  brandConfigured: boolean;
  stylePreset: StylePreset | null;
  assetHints: string[];
  voice: BrandVoice;
  sourceStatus: ProjectSourceStatus;
  creativeGuides: CreativeGuides;
}

export class ProjectContextError extends Error {
  readonly status = 422;
  readonly code: string;
  readonly projectId: string;

  constructor(code: string, projectId: string, message: string) {
    super(message);
    this.name = "ProjectContextError";
    this.code = code;
    this.projectId = projectId;
  }
}

export async function getProjectContext(
  projectId: string,
  options: { stylePresetId?: string | null } = {}
): Promise<ProjectContext> {
  const [brand, stylePreset, sourceStatus] = await Promise.all([
    getBrand(projectId),
    options.stylePresetId ? getPreset(options.stylePresetId) : Promise.resolve(null),
    getProjectSourceStatus(projectId),
  ]);

  if (
    stylePreset &&
    stylePreset.scope !== "shared" &&
    stylePreset.projectId !== projectId
  ) {
    throw new ProjectContextError(
      "style_preset_project_mismatch",
      projectId,
      "Style preset does not belong to this project."
    );
  }

  return {
    projectId,
    brand,
    brandConfigured: isBrandConfigured(brand),
    stylePreset,
    assetHints: brand.kit?.assetHints ?? [],
    voice: brand.voice,
    sourceStatus,
    creativeGuides: buildCreativeGuidesFromBrand(brand),
  };
}

export function requireConfiguredProjectContext(
  context: ProjectContext
): ProjectContext {
  if (!context.brandConfigured) {
    throw new ProjectContextError(
      "brand_not_configured",
      context.projectId,
      "Brand settings are required before generating carousel output."
    );
  }
  return context;
}

export function isProjectContextError(
  error: unknown
): error is ProjectContextError {
  return error instanceof ProjectContextError;
}
