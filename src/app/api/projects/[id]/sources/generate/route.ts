import { NextResponse } from "next/server";
import { compileProjectSourceDocs } from "@/lib/project-source-compiler";
import { writeProjectSourceDocs } from "@/lib/project-sources";
import { getProject } from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const text = await request.text();
    const body: unknown = text.trim() ? JSON.parse(text) : {};
    const docs = await compileProjectSourceDocs(id);
    const status = await writeProjectSourceDocs(id, docs, {
      overwrite: hasOverwrite(body),
    });
    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    const status = /already exists/.test(message) ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

function hasOverwrite(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "overwrite" in value &&
    value.overwrite === true
  );
}
