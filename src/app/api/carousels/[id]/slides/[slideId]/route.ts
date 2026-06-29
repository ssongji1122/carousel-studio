import { NextResponse } from "next/server";
import { updateSlide, deleteSlide, getCarousel } from "@/lib/carousels";
import { getProjectContext, isProjectContextError, requireConfiguredProjectContext } from "@/lib/project-context";
import { buildSlideFromStructured } from "@/lib/slide-build";
import { findDuplicateMediaSource } from "@/lib/carousel-quality";
import { normalizeSlideStyle } from "@/lib/slide-style";
import type { SlideRole, MediaRef, SlideTone } from "@/types/carousel";

const TONES: readonly SlideTone[] = ["paper", "soft", "dark", "wine"];
const asTone = (v: unknown): SlideTone | undefined =>
  TONES.includes(v as SlideTone) ? (v as SlideTone) : undefined;

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; slideId: string }> }
) {
  const { id, slideId } = await params;
  try {
    const body = await request.json();

    // Re-render when structured fields are being updated
    if (body.role !== undefined || body.headline !== undefined || body.body !== undefined || body.items !== undefined || body.media !== undefined || body.tone !== undefined || body.style !== undefined) {
      const carousel = await getCarousel(id);
      if (!carousel) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const existing = carousel.slides.find((s) => s.id === slideId);
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const structured = {
        role: (body.role ?? existing.role) as SlideRole,
        headline: String(body.headline ?? existing.headline),
        body: String(body.body ?? existing.body),
        items: Array.isArray(body.items)
          ? body.items.map((x: unknown) => String(x))
          : (existing.items ?? []),
        media: (body.media !== undefined ? body.media : existing.media) as MediaRef | null,
        tone: asTone(body.tone) ?? existing.tone,
        style: normalizeSlideStyle(body.style, existing.style),
      };
      if (body.media !== undefined) {
        const duplicateMedia = findDuplicateMediaSource(carousel, structured.media, slideId);
        if (duplicateMedia) {
          return NextResponse.json(
            { error: duplicateMedia.message, code: duplicateMedia.code, issue: duplicateMedia },
            { status: 409 }
          );
        }
      }

      const context = requireConfiguredProjectContext(
        await getProjectContext(carousel.projectId)
      );
      const { html, violations } = buildSlideFromStructured(
        structured,
        context.brand,
        carousel.aspectRatio,
        carousel.characterSheet
      );

      const updates = {
        ...structured,
        html,
        ...(typeof body.notes === "string" ? { notes: body.notes } : {}),
      };

      const slide = await updateSlide(id, slideId, updates);
      if (!slide) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ ...slide, violations });
    }

    // Backward-compat: raw updates (html/notes only)
    const slide = await updateSlide(id, slideId, body);
    if (!slide) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(slide);
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; slideId: string }> }
) {
  const { id, slideId } = await params;
  const deleted = await deleteSlide(id, slideId);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
