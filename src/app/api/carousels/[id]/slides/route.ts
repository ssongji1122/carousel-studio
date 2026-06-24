import { NextResponse } from "next/server";
import { addSlide, reorderSlides, getCarousel } from "@/lib/carousels";
import { getBrand } from "@/lib/brand";
import { buildSlideFromStructured } from "@/lib/slide-build";
import type { SlideRole, MediaRef, SlideTone } from "@/types/carousel";

const TONES: readonly SlideTone[] = ["paper", "soft", "dark", "wine"];
const asTone = (v: unknown): SlideTone | undefined =>
  TONES.includes(v as SlideTone) ? (v as SlideTone) : undefined;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();

    // Structured input takes precedence over raw html
    if (body.role !== undefined || body.headline !== undefined || body.body !== undefined || body.items !== undefined || body.tone !== undefined) {
      const carousel = await getCarousel(id);
      if (!carousel) {
        return NextResponse.json(
          { error: "Carousel not found" },
          { status: 404 }
        );
      }

      const structured = {
        role: (body.role ?? "body") as SlideRole,
        headline: String(body.headline ?? ""),
        body: String(body.body ?? ""),
        items: Array.isArray(body.items) ? body.items.map((x: unknown) => String(x)) : [],
        media: (body.media ?? null) as MediaRef | null,
        tone: asTone(body.tone),
      };

      const brand = await getBrand();
      const { html, violations } = buildSlideFromStructured(
        structured,
        brand,
        carousel.aspectRatio
      );

      const notes = typeof body.notes === "string" ? body.notes : "";
      const slide = await addSlide(id, html, notes, structured);
      if (!slide) {
        return NextResponse.json(
          { error: "Carousel not found or max slides reached" },
          { status: 400 }
        );
      }
      return NextResponse.json({ ...slide, violations }, { status: 201 });
    }

    // Backward-compat: raw html path
    const { html, notes } = body as { html?: string; notes?: string };
    if (!html || typeof html !== "string") {
      return NextResponse.json(
        { error: "HTML content is required" },
        { status: 400 }
      );
    }

    const slide = await addSlide(id, html, notes);
    if (!slide) {
      return NextResponse.json(
        { error: "Carousel not found or max slides reached" },
        { status: 400 }
      );
    }
    return NextResponse.json(slide, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { slideIds } = body as { slideIds?: string[] };

    if (!Array.isArray(slideIds)) {
      return NextResponse.json(
        { error: "slideIds array is required" },
        { status: 400 }
      );
    }

    const success = await reorderSlides(id, slideIds);
    if (!success) {
      return NextResponse.json(
        { error: "Carousel not found or invalid slide IDs" },
        { status: 400 }
      );
    }

    const carousel = await getCarousel(id);
    return NextResponse.json({ slides: carousel?.slides ?? [] });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
