import { NextResponse } from "next/server";
import { getCarousel, setCharacterSheet } from "@/lib/carousels";
import { buildCharacterSheet } from "@/lib/character-sheet";
import { getProjectContext, isProjectContextError, requireConfiguredProjectContext } from "@/lib/project-context";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const carousel = await getCarousel(id);
  if (!carousel) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ characterSheet: carousel.characterSheet ?? null });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const carousel = await getCarousel(id);
    if (!carousel) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const context = requireConfiguredProjectContext(
      await getProjectContext(carousel.projectId)
    );
    const characterSheet = buildCharacterSheet(
      context.brand,
      carousel.referenceImages ?? []
    );
    await setCharacterSheet(id, characterSheet);
    return NextResponse.json({ characterSheet }, { status: 201 });
  } catch (error) {
    if (isProjectContextError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code, projectId: error.projectId },
        { status: error.status }
      );
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
