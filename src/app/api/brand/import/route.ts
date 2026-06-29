import { NextRequest, NextResponse } from "next/server";
import {
  hasAvailableAgentProvider,
  isAgentChainError,
  runAgentWithFallback,
} from "@/lib/agent-providers";
import { resolveActiveBrand } from "@/lib/resolve-brand";
import { buildBrandImportPrompt } from "@/lib/brand-import-prompt";
import { fetchInstagramProfile, extractPalette, profileImageUrls } from "@/lib/instagram-brand";
import { fetchWebsiteSignals, resolveBrandWebsite } from "@/lib/website-brand";
import { buildBrandDoc, type BrandSources } from "@/lib/brand-doc";
import { buildBrandAnalysis, applyBrandAnalysis } from "@/lib/brand-analysis";
import { getActiveProjectId } from "@/lib/workspace";
import { updateBrand } from "@/lib/brand";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// POST /api/brand/import  { docs: string }
// Claude reads the brand documents, extracts a brand profile, and PUTs it to
// /api/brand. Returns the refreshed brand.
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
  const fields = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const instagram = typeof fields.instagram === "string" ? fields.instagram.trim() : "";
  const website = typeof fields.website === "string" ? fields.website.trim() : "";

  // Source path: fetch Instagram and/or website signals, synthesize a single
  // brand document, then fall through to the same Claude extraction as docs.
  let docs = typeof fields.docs === "string" ? fields.docs : "";
  // All distinct colors we observed, returned to the UI so the user can pick
  // which one is the accent/main — Claude maps by dominance, but a brand's
  // accent is often a low-frequency color a human spots instantly.
  let extractedPalette: string[] = [];
  let collectedSources: BrandSources | null = null;
  if (instagram || website) {
    try {
      const sources: BrandSources = {};
      let siteUrl = website;
      if (instagram) {
        const profile = await fetchInstagramProfile(instagram);
        const palette = await extractPalette(
          profileImageUrls(profile),
          6,
          profile.profilePicUrl ?? undefined
        );
        sources.ig = { profile, palette };
        // No website given? Discover the official site from the profile's
        // bio links (unwrapping IG redirects and litt.ly aggregators).
        if (!siteUrl) {
          siteUrl = (await resolveBrandWebsite(profile)) ?? "";
        }
      }
      if (siteUrl) {
        // A discovered site may be unreachable; don't fail the whole import.
        try {
          sources.web = await fetchWebsiteSignals(siteUrl);
        } catch {
          if (website) throw new Error("웹사이트를 불러오지 못했습니다. 주소를 확인해 주세요.");
        }
      }
      extractedPalette = Array.from(
        new Set([
          ...(sources.ig?.palette ?? []),
          ...(sources.web?.ogPalette ?? []),
          ...(sources.web?.cssColors ?? []),
        ])
      );
      docs = buildBrandDoc(sources);
      collectedSources = sources;
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

  const prompt = buildBrandImportPrompt(docs, new URL(request.url).origin);

  try {
    await runAgentWithFallback({
      name: "carrusel-brand-import",
      userPrompt: "브랜드 문서에서 색·폰트·보이스를 추출해 brand API에 PUT해줘.",
      systemPrompt: prompt,
      cwd: process.cwd(),
      claudeAllowedTools: ["Bash"],
    });
  } catch (error) {
    if (isAgentChainError(error)) {
      return NextResponse.json(
        { error: error.message, attempts: error.attempts },
        { status: error.status }
      );
    }
    return NextResponse.json({ error: "Brand import failed" }, { status: 502 });
  }

  const updated = await resolveActiveBrand();
  if (collectedSources) {
    const analysis = buildBrandAnalysis(collectedSources, updated);
    if (analysis) {
      const projectId = await getActiveProjectId();
      const analyzed = await updateBrand(projectId, applyBrandAnalysis(updated, analysis));
      return NextResponse.json({ ...analyzed, extractedPalette });
    }
  }

  return NextResponse.json({ ...updated, extractedPalette });
}
