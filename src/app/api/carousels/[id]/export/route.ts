import { NextResponse } from "next/server";
import archiver from "archiver";
import { getCarousel } from "@/lib/carousels";
import { exportAllSlides } from "@/lib/export-slides";
import { validateCarouselQuality } from "@/lib/carousel-quality";
import { getProjectContext } from "@/lib/project-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const ZIP_FALLBACK_NAME_MAX = 48;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const carousel = await getCarousel(id);

  if (!carousel) {
    return NextResponse.json({ error: "Carousel not found" }, { status: 404 });
  }

  if (carousel.slides.length === 0) {
    return NextResponse.json({ error: "No slides to export" }, { status: 400 });
  }
  const context = await getProjectContext(carousel.projectId);
  const quality = validateCarouselQuality(
    carousel,
    context.brand,
    context.creativeGuides
  );
  if (!quality.ok) {
    return NextResponse.json(
      { error: "Quality gate failed", code: "quality_gate_failed", quality },
      { status: 422 }
    );
  }

  try {
    // Export all slides to PNG buffers
    const pngBuffers = await exportAllSlides(
      carousel.slides,
      carousel.aspectRatio
    );

    // Build ZIP archive and collect all data
    const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
      const archive = archiver("zip", { zlib: { level: 5 } });
      const chunks: Buffer[] = [];

      archive.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      archive.on("end", () => {
        resolve(Buffer.concat(chunks));
      });

      archive.on("error", (err) => {
        reject(err);
      });

      try {
        for (const { name, buffer } of pngBuffers) {
          archive.append(buffer, { name });
        }
        archive.finalize();
      } catch (err) {
        archive.destroy();
        reject(err);
      }
    });

    return new Response(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": buildZipContentDisposition(carousel.name, carousel.id),
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Export failed: ${message}` },
      { status: 500 }
    );
  }
}

function buildZipContentDisposition(name: string, id: string): string {
  const utf8Name = `carousel-${name.trim() || id}.zip`;
  const asciiStem = name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, ZIP_FALLBACK_NAME_MAX);
  const fallbackName = `carousel-${asciiStem || id.slice(0, 8)}.zip`;
  return `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(utf8Name)}`;
}
