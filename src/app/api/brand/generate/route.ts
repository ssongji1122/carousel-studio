import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import crossSpawn from "cross-spawn";
import path from "path";
import { mkdir, readFile } from "fs/promises";
import { getClaudePath, isClaudeAvailable } from "@/lib/claude-path";
import { resolveActiveBrand } from "@/lib/resolve-brand";
import { buildBrandGeneratePrompt, type BrandBrief } from "@/lib/brand-generate-prompt";
import { getRequestOrigin } from "@/lib/request-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// POST /api/brand/generate  { name, business, target, mood, avoid? }
// Claude infers colors/fonts/voice from the brief, PUTs them to /api/brand,
// and writes brand.md + design.md takeaway docs. Returns the brand + both docs.
export async function POST(request: NextRequest) {
  if (!isClaudeAvailable()) {
    return NextResponse.json({ error: "Claude CLI not found" }, { status: 503 });
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

  const prompt = buildBrandGeneratePrompt(brief, genDir, getRequestOrigin(request));
  const claudePath = getClaudePath();
  const isWindowsShim =
    process.platform === "win32" && /\.(cmd|bat)$/i.test(claudePath);
  const spawner = isWindowsShim ? crossSpawn : spawn;

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawner(
        claudePath,
        [
          "-p",
          "답변으로 브랜드 색·폰트·보이스를 정해 brand API에 PUT하고 brand.md·design.md를 작성해줘.",
          "--append-system-prompt",
          prompt,
          "--allowedTools",
          "Bash Write",
          "--max-budget-usd",
          "1.00",
          "--name",
          "carrusel-brand-generate",
        ],
        { cwd: process.cwd(), stdio: "ignore" }
      );
      child.on("error", reject);
      child.on("close", (code) =>
        code === 0 ? resolve() : reject(new Error("Claude CLI exited " + code))
      );
    });
  } catch {
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
