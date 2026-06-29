import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { mkdir, readFile } from "fs/promises";
import {
  hasAvailableAgentProvider,
  isAgentChainError,
  runAgentWithFallback,
} from "@/lib/agent-providers";
import { resolveActiveBrand } from "@/lib/resolve-brand";
import { buildBrandGeneratePrompt, type BrandBrief } from "@/lib/brand-generate-prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// POST /api/brand/generate  { name, business, target, mood, avoid? }
// Claude infers colors/fonts/voice from the brief, PUTs them to /api/brand,
// and writes brand.md + design.md takeaway docs. Returns the brand + both docs.
export async function POST(request: NextRequest) {
  if (!hasAvailableAgentProvider()) {
    return NextResponse.json(
      { error: "No AI agent provider found. Install Claude, Codex, or Cursor Agent CLI." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const f = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const str = (k: string) => (typeof f[k] === "string" ? (f[k] as string).trim() : "");
  const brief: BrandBrief = {
    name: str("name"),
    business: str("business"),
    target: str("target"),
    mood: str("mood"),
    avoid: str("avoid"),
  };
  if (!brief.name || !brief.business || !brief.mood) {
    return NextResponse.json({ error: "name, business, mood required" }, { status: 400 });
  }

  const genDir = path.resolve(process.cwd(), "data", "generated");
  await mkdir(genDir, { recursive: true });

  const prompt = buildBrandGeneratePrompt(
    brief,
    genDir,
    new URL(request.url).origin
  );

  try {
    await runAgentWithFallback({
      name: "carrusel-brand-generate",
      userPrompt: "답변으로 브랜드 색·폰트·보이스를 정해 brand API에 PUT하고 brand.md·design.md를 작성해줘.",
      systemPrompt: prompt,
      cwd: process.cwd(),
      claudeAllowedTools: ["Bash", "Write"],
    });
  } catch (error) {
    if (isAgentChainError(error)) {
      return NextResponse.json(
        { error: error.message, attempts: error.attempts },
        { status: error.status }
      );
    }
    return NextResponse.json({ error: "Brand generation failed" }, { status: 502 });
  }

  const readDoc = async (file: string) => {
    try {
      return await readFile(path.join(genDir, file), "utf-8");
    } catch {
      return "";
    }
  };
  const [brandMd, designMd] = await Promise.all([readDoc("brand.md"), readDoc("design.md")]);
  const updated = await resolveActiveBrand();
  const c = updated.colors;
  const extractedPalette = Array.from(
    new Set([c.accent, c.primary, c.background, c.surface, c.secondary, c.dark].filter(Boolean))
  ) as string[];

  return NextResponse.json({ ...updated, extractedPalette, brandMd, designMd });
}
