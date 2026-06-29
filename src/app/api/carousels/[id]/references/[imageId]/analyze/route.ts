import { NextResponse } from "next/server";
import { getCarousel, setCharacterSheet, updateReferenceImage } from "@/lib/carousels";
import { buildCharacterSheet } from "@/lib/character-sheet";
import { getProjectContext, isProjectContextError, requireConfiguredProjectContext } from "@/lib/project-context";
import { analyzeReferenceImageWithVision, resolveVisionProvider } from "@/lib/vision-analysis";
import type { VisionProviderName } from "@/types/carousel";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const { id, imageId } = await params;
  try {
    const body = await request.json().catch(() => ({}));
    const providerName = (body.provider ?? "mock") as VisionProviderName;
    let provider;
    try {
      provider = resolveVisionProvider(providerName);
    } catch {
      return NextResponse.json(
        {
          error: "Vision provider is not configured",
          code: "vision_provider_not_configured",
          provider: providerName,
        },
        { status: 501 }
      );
    }

    const carousel = await getCarousel(id);
    if (!carousel) {
      return NextResponse.json({ error: "Carousel not found" }, { status: 404 });
    }
    const image = carousel.referenceImages?.find((ref) => ref.id === imageId);
    if (!image) {
      return NextResponse.json({ error: "Reference image not found" }, { status: 404 });
    }

    const context = requireConfiguredProjectContext(
      await getProjectContext(carousel.projectId)
    );
    const analyzed = await analyzeReferenceImageWithVision(
      { image, brand: context.brand },
      provider
    );
    const saved = await updateReferenceImage(id, imageId, analyzed);
    if (!saved) {
      return NextResponse.json({ error: "Reference image not found" }, { status: 404 });
    }

    const updatedCarousel = await getCarousel(id);
    if (updatedCarousel) {
      const characterSheet = buildCharacterSheet(
        context.brand,
        updatedCarousel.referenceImages ?? []
      );
      await setCharacterSheet(id, characterSheet);
      return NextResponse.json({ reference: saved, characterSheet }, { status: 200 });
    }

    return NextResponse.json({ reference: saved }, { status: 200 });
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
