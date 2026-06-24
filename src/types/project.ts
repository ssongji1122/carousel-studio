// A Project is the top-level scope that owns carousels, plans, presets, and a
// brand profile. Keeping generation scoped to a project prevents one brand's
// tone (e.g. a sample) from bleeding into another's output.
export interface Project {
  id: string;            // slug, e.g. "studio-soluta", "sample-ordinal"
  name: string;          // display name, e.g. "studio.soluta"
  defaultBrandId: string; // v1: always "main"
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  activeProjectId: string;
  projects: Project[];
}
