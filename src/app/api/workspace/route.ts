import { NextResponse } from "next/server";
import { getWorkspace, setActiveProject } from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getWorkspace());
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { activeProjectId } = body as { activeProjectId?: string };
    if (!activeProjectId || typeof activeProjectId !== "string") {
      return NextResponse.json({ error: "activeProjectId is required" }, { status: 400 });
    }
    const ws = await setActiveProject(activeProjectId);
    return NextResponse.json(ws);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid request";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
