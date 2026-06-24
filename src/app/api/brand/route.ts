import { NextResponse } from "next/server";
import { getBrand, updateBrand } from "@/lib/brand";
import { getActiveProjectId } from "@/lib/workspace";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId") || (await getActiveProjectId());
  const brand = await getBrand(projectId);
  return NextResponse.json(brand);
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const url = new URL(request.url);
    const { projectId: bodyProjectId, ...updates } = body as Record<string, unknown>;
    const projectId =
      url.searchParams.get("projectId") ||
      (typeof bodyProjectId === "string" ? bodyProjectId : "") ||
      (await getActiveProjectId());
    const updated = await updateBrand(projectId, updates);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
