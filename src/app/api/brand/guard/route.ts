import { NextResponse } from "next/server";
import { guardPalette } from "@/lib/palette-expand";
import type { BrandColors } from "@/types/brand";

// POST /api/brand/guard { colors: Partial<BrandColors> }
// Hybrid guard: keep the given (brand-aware) colors, fill missing tokens, and
// deterministically guarantee WCAG contrast. Returns guarded colors + which
// roles were adjusted.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = (body?.colors ?? {}) as Partial<BrandColors>;
    if (typeof input !== "object" || input === null) {
      return NextResponse.json({ error: "colors object required" }, { status: 400 });
    }
    const { colors, adjusted } = guardPalette(input);
    return NextResponse.json({ colors, adjusted });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
