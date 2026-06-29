import { NextResponse } from "next/server";
import { getProject } from "@/lib/workspace";
import {
  getProjectSourceStatus,
  isProjectSourceKey,
  writeProjectSourceDocs,
} from "@/lib/project-sources";
import type { ProjectSourceWrite } from "@/types/project-source";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const includeContent = new URL(request.url).searchParams.get("content") === "1";
  return NextResponse.json(
    await getProjectSourceStatus(id, { includeContent })
  );
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const body: unknown = await request.json();
    const rawDocs = readBodyField(body, "docs");
    if (!rawDocs || typeof rawDocs !== "object" || Array.isArray(rawDocs)) {
      return NextResponse.json({ error: "docs object is required" }, { status: 400 });
    }

    const docs: ProjectSourceWrite[] = [];
    for (const [key, content] of Object.entries(rawDocs)) {
      if (!isProjectSourceKey(key)) {
        return NextResponse.json({ error: `Unknown source doc: ${key}` }, { status: 400 });
      }
      if (typeof content !== "string" || !content.trim()) {
        return NextResponse.json({ error: `${key} content is required` }, { status: 400 });
      }
      docs.push({ key, content });
    }

    if (!docs.length) {
      return NextResponse.json({ error: "At least one source doc is required" }, { status: 400 });
    }

    const status = await writeProjectSourceDocs(id, docs, {
      overwrite: readBodyField(body, "overwrite") === true,
    });
    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    const status = /already exists/.test(message) ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

function readBodyField(value: unknown, key: string): unknown {
  if (typeof value !== "object" || value === null || !(key in value)) return undefined;
  for (const [entryKey, entryValue] of Object.entries(value)) {
    if (entryKey === key) return entryValue;
  }
  return undefined;
}
