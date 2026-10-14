export type SkillpackStage =
  | "reference-intake"
  | "brand-analysis"
  | "strategy-brief"
  | "copy-guide"
  | "image-guide"
  | "structured-output"
  | "quality-gate";

export type SkillpackIntegrationMode =
  | "adapter"
  | "local-guidance"
  | "optional-cli"
  | "blocked-runtime";

export type SkillpackRisk = "low" | "medium" | "high";

export interface ExternalSkillpack {
  id: string;
  name: string;
  repo: string;
  url: string;
  license: string;
  stage: SkillpackStage;
  integrationMode: SkillpackIntegrationMode;
  risk: SkillpackRisk;
  enabledByDefault: boolean;
  targetModule: string;
  notes: string;
}
