import { readDataSafe, writeData } from "./data";
import { now } from "./utils";
import type { Workspace, Project } from "@/types/project";

const FILE = "workspace.json";

const DEFAULT_PROJECTS: Project[] = [
  {
    id: "studio-soluta",
    name: "studio.soluta",
    defaultBrandId: "main",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "sample-ordinal",
    name: "ORDINAL EDITION",
    defaultBrandId: "main",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "sample-rose-shaker",
    name: "로즈쉐이커",
    defaultBrandId: "main",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "sample-price",
    name: "프라이스",
    defaultBrandId: "main",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "sample-momspepper",
    name: "맘스페퍼",
    defaultBrandId: "main",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "sample-pogon",
    name: "포곤",
    defaultBrandId: "main",
    createdAt: "",
    updatedAt: "",
  },
];

function defaultWorkspace(): Workspace {
  return {
    activeProjectId: "studio-soluta",
    projects: DEFAULT_PROJECTS.map((project) => ({ ...project })),
  };
}

function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project"
  );
}

export async function getWorkspace(): Promise<Workspace> {
  const ws = await readDataSafe<Workspace>(FILE, defaultWorkspace());
  if (!ws.projects || ws.projects.length === 0) return defaultWorkspace();
  // Self-heal a dangling activeProjectId so the app never points at nothing.
  if (!ws.projects.some((p) => p.id === ws.activeProjectId)) {
    ws.activeProjectId = ws.projects[0].id;
  }
  return ws;
}

export async function listProjects(): Promise<Project[]> {
  return (await getWorkspace()).projects;
}

export async function getProject(id: string): Promise<Project | null> {
  return (await getWorkspace()).projects.find((p) => p.id === id) ?? null;
}

export async function getActiveProjectId(): Promise<string> {
  return (await getWorkspace()).activeProjectId;
}

export async function setActiveProject(id: string): Promise<Workspace> {
  const ws = await getWorkspace();
  if (!ws.projects.some((p) => p.id === id)) {
    throw new Error(`Unknown project: ${id}`);
  }
  ws.activeProjectId = id;
  await writeData(FILE, ws);
  return ws;
}

export async function createProject(name: string, id?: string): Promise<Project> {
  const ws = await getWorkspace();
  const pid = id ?? slugify(name);
  if (ws.projects.some((p) => p.id === pid)) {
    throw new Error(`Project already exists: ${pid}`);
  }
  const project: Project = {
    id: pid,
    name: name.trim(),
    defaultBrandId: "main",
    createdAt: now(),
    updatedAt: now(),
  };
  ws.projects.push(project);
  await writeData(FILE, ws);
  return project;
}
