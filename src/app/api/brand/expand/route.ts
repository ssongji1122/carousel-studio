import { NextResponse } from "next/server";
import { expandPalette, contrastRatio } from "@/lib/palette-expand";

// POST /api/brand/expand { seed: "#RRGGBB" }
// Expands one seed color into a full, WCAG-checked brand palette (OKLCH).
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const raw = typeof body?.seed === "string" ? body.seed.trim() : "";
    const seed = raw.startsWith("#") ? raw : `#${raw}`;
    if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(seed)) {
      return NextResponse.json({ error: "valid hex seed required" }, { status: 400 });
    }
    const colors = expandPalette(seed);
    const contrast = {
      "primary/background": Math.round(contrastRatio(colors.primary, colors.background) * 100) / 100,
      "accent/background": Math.round(contrastRatio(colors.accent, colors.background) * 100) / 100,
    };
    return NextResponse.json({ colors, contrast });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
