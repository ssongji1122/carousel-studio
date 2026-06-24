import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import crossSpawn from "cross-spawn";
import { getClaudePath, isClaudeAvailable } from "@/lib/claude-path";
import { getBrand } from "@/lib/brand";
import { buildBrandImportPrompt } from "@/lib/brand-import-prompt";
import { fetchInstagramProfile, extractPalette, profileImageUrls } from "@/lib/instagram-brand";
import { fetchWebsiteSignals } from "@/lib/website-brand";
import { buildBrandDoc, type BrandSources } from "@/lib/brand-doc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// POST /api/brand/import  { docs: string }
// Claude reads the brand documents, extracts a brand profile, and PUTs it to
// /api/brand. Returns the refreshed brand.
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
  const fields = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const instagram = typeof fields.instagram === "string" ? fields.instagram.trim() : "";
  const website = typeof fields.website === "string" ? fields.website.trim() : "";

  // Source path: fetch Instagram and/or website signals, synthesize a single
  // brand document, then fall through to the same Claude extraction as docs.
  let docs = typeof fields.docs === "string" ? fields.docs : "";
  if (instagram || website) {
    try {
      const sources: BrandSources = {};
      if (instagram) {
        const profile = await fetchInstagramProfile(instagram);
        const palette = await extractPalette(profileImageUrls(profile));
        sources.ig = { profile, palette };
      }
      if (website) {
        sources.web = await fetchWebsiteSignals(website);
      }
      docs = buildBrandDoc(sources);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "소스에서 가져오지 못했습니다.";
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  if (!docs.trim()) {
    return NextResponse.json({ error: "docs, instagram, or website required" }, { status: 400 });
  }
  if (docs.length > 60000) {
    return NextResponse.json({ error: "docs too large" }, { status: 413 });
  }

  const prompt = buildBrandImportPrompt(docs);
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
          "브랜드 문서에서 색·폰트·보이스를 추출해 brand API에 PUT해줘.",
          "--append-system-prompt",
          prompt,
          "--allowedTools",
          "Bash",
          "--max-budget-usd",
          "1.00",
          "--name",
          "carrusel-brand-import",
        ],
        { cwd: process.cwd(), stdio: "ignore" }
      );
      child.on("error", reject);
      child.on("close", (code) =>
        code === 0 ? resolve() : reject(new Error("Claude CLI exited " + code))
      );
    });
  } catch {
    return NextResponse.json({ error: "Brand import failed" }, { status: 502 });
  }

  const updated = await getBrand();
  return NextResponse.json(updated);
}
