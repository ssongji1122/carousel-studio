import { NextResponse } from "next/server";
import { listPresets, createPreset } from "@/lib/style-presets";
import { getActiveProjectId } from "@/lib/workspace";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId") || (await getActiveProjectId());
  const presets = await listPresets(projectId);
  return NextResponse.json({ presets });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, brand, designRules, exampleSlideHtml, aspectRatio, tags, projectId } = body;

    if (!name || !designRules) {
      return NextResponse.json(
        { error: "name and designRules are required" },
        { status: 400 }
      );
    }

    const pid = (typeof projectId === "string" ? projectId : "") || (await getActiveProjectId());
    const preset = await createPreset({
      projectId: pid,
      scope: "project",
      name,
      description: description || "",
      brand: brand || {},
      designRules,
      exampleSlideHtml: exampleSlideHtml || "",
      aspectRatio: aspectRatio || "4:5",
      tags: tags || [],
    });

    return NextResponse.json(preset, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
