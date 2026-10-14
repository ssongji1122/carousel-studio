import { mkdir, readFile, rename, stat, writeFile } from "fs/promises";
import path from "path";
import type {
  ProjectSourceDefinition,
  ProjectSourceDoc,
  ProjectSourceKey,
  ProjectSourceStatus,
  ProjectSourceWrite,
} from "@/types/project-source";

export const PROJECT_SOURCE_DEFINITIONS: readonly ProjectSourceDefinition[] = [
  {
    key: "brand",
    fileName: "brand.md",
    title: "Brand",
    description: "브랜드 정체성, 제품, 고객, 메타포, 금지 방향",
    required: true,
  },
  {
    key: "design",
    fileName: "design.md",
    title: "Design",
    description: "색, 폰트, 레이아웃, 이미지 톤, 디자인 토큰",
    required: true,
  },
  {
    key: "voice",
    fileName: "voice.md",
    title: "Voice",
    description: "말투, 문장 패턴, 선호 표현, 피할 표현",
    required: true,
  },
  {
    key: "assets",
    fileName: "assets.md",
    title: "Assets",
    description: "로고, 캐릭터, 제품 이미지, 참고 이미지",
    required: false,
  },
  {
    key: "generation-rules",
    fileName: "generation-rules.md",
    title: "Generation Rules",
    description: "캐러셀 생성 규칙, 품질 기준, 반복 제한",
    required: false,
  },
];

const SOURCE_KEYS: ReadonlySet<string> = new Set(
  PROJECT_SOURCE_DEFINITIONS.map((doc) => doc.key)
);
let testDataDir: string | null = null;

export function setProjectSourcesDataDirForTests(dir: string | null): void {
  testDataDir = dir;
}

function dataDir(): string {
  if (testDataDir) return testDataDir;
  return path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
}

function assertProjectId(projectId: string): void {
  if (!/^[a-zA-Z0-9._-]+$/.test(projectId)) {
    throw new Error(`Invalid projectId: ${projectId}`);
  }
}

function assertSourceKey(key: ProjectSourceKey): void {
  if (!SOURCE_KEYS.has(key)) {
    throw new Error(`Invalid project source key: ${key}`);
  }
}

function definitionFor(key: ProjectSourceKey): ProjectSourceDefinition {
  const definition = PROJECT_SOURCE_DEFINITIONS.find((doc) => doc.key === key);
  if (!definition) throw new Error(`Unknown project source key: ${key}`);
  return definition;
}

function projectSourceDir(projectId: string): string {
  assertProjectId(projectId);
  return path.join(dataDir(), "project-sources", projectId);
}

function projectSourcePath(projectId: string, key: ProjectSourceKey): string {
  assertSourceKey(key);
  return path.join(projectSourceDir(projectId), definitionFor(key).fileName);
}

export function isProjectSourceKey(value: unknown): value is ProjectSourceKey {
  return typeof value === "string" && SOURCE_KEYS.has(value);
}

export async function getProjectSourceStatus(
  projectId: string,
  options: { includeContent?: boolean } = {}
): Promise<ProjectSourceStatus> {
  const docs = await Promise.all(
    PROJECT_SOURCE_DEFINITIONS.map((definition) =>
      readProjectSourceDoc(projectId, definition.key, options)
    )
  );
  const requiredMissing = docs
    .filter((doc) => doc.required && !doc.exists)
    .map((doc) => doc.key);

  return {
    projectId,
    docs,
    requiredMissing,
    complete: requiredMissing.length === 0,
  };
}

export async function readProjectSourceDoc(
  projectId: string,
  key: ProjectSourceKey,
  options: { includeContent?: boolean } = {}
): Promise<ProjectSourceDoc> {
  const definition = definitionFor(key);
  const filePath = projectSourcePath(projectId, key);
  try {
    const info = await stat(filePath);
    const content = options.includeContent ? await readFile(filePath, "utf-8") : undefined;
    return {
      ...definition,
      exists: true,
      updatedAt: info.mtime.toISOString(),
      size: info.size,
      ...(content !== undefined ? { content } : {}),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return {
      ...definition,
      exists: false,
      updatedAt: null,
      size: 0,
      ...(options.includeContent ? { content: "" } : {}),
    };
  }
}

export async function writeProjectSourceDocs(
  projectId: string,
  docs: ProjectSourceWrite[],
  options: { overwrite?: boolean } = {}
): Promise<ProjectSourceStatus> {
  const dir = projectSourceDir(projectId);
  await mkdir(dir, { recursive: true });

  for (const doc of docs) {
    await writeProjectSourceDoc(projectId, doc.key, doc.content, options);
  }

  return getProjectSourceStatus(projectId, { includeContent: true });
}

export async function writeProjectSourceDoc(
  projectId: string,
  key: ProjectSourceKey,
  content: string,
  options: { overwrite?: boolean } = {}
): Promise<ProjectSourceDoc> {
  if (!content.trim()) {
    throw new Error(`${definitionFor(key).fileName} content is required`);
  }

  const filePath = projectSourcePath(projectId, key);
  const dir = projectSourceDir(projectId);
  await mkdir(dir, { recursive: true });

  if (!options.overwrite) {
    try {
      await stat(filePath);
      throw new Error(`${definitionFor(key).fileName} already exists`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  const tmpPath = `${filePath}.tmp`;
  await writeFile(tmpPath, content, "utf-8");
  await rename(tmpPath, filePath);
  return readProjectSourceDoc(projectId, key, { includeContent: true });
}
