import { NextResponse } from "next/server";
import { listCarousels, createCarousel } from "@/lib/carousels";
import { getActiveProjectId } from "@/lib/workspace";
import type { AspectRatio } from "@/types/carousel";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId") || (await getActiveProjectId());
  const carousels = await listCarousels(projectId);
  return NextResponse.json({ carousels });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, aspectRatio, projectId } = body as {
      name?: string;
      aspectRatio?: AspectRatio;
      projectId?: string;
    };

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const validRatios: AspectRatio[] = ["1:1", "4:5", "9:16"];
    const ratio = validRatios.includes(aspectRatio as AspectRatio)
      ? (aspectRatio as AspectRatio)
      : "4:5";

    const pid = projectId || (await getActiveProjectId());
    const carousel = await createCarousel(pid, name.trim(), ratio);
    return NextResponse.json(carousel, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
