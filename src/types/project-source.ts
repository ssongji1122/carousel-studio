export type ProjectSourceKey =
  | "brand"
  | "design"
  | "voice"
  | "assets"
  | "generation-rules";

export interface ProjectSourceDefinition {
  key: ProjectSourceKey;
  fileName: string;
  title: string;
  description: string;
  required: boolean;
}

export interface ProjectSourceDoc {
  key: ProjectSourceKey;
  fileName: string;
  title: string;
  description: string;
  required: boolean;
  exists: boolean;
  updatedAt: string | null;
  size: number;
  content?: string;
}

export interface ProjectSourceStatus {
  projectId: string;
  docs: ProjectSourceDoc[];
  requiredMissing: ProjectSourceKey[];
  complete: boolean;
}

export interface ProjectSourceWrite {
  key: ProjectSourceKey;
  content: string;
}
