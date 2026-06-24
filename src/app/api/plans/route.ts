import { NextResponse } from "next/server";
import { listPlans, createPlan } from "@/lib/plans";
import { getActiveProjectId } from "@/lib/workspace";
import { validateBrief, clampCount } from "@/lib/plan-input";
import type { Channel } from "@/types/carousel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId") || (await getActiveProjectId());
  return NextResponse.json({ plans: await listPlans(projectId) });
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const brief = validateBrief(body);
  if (!brief) return NextResponse.json({ error: "scope/target required" }, { status: 400 });
  const b = body as Record<string, unknown>;
  const channel: Channel = b.channel === "threads" ? "threads" : "instagram";
  const projectId =
    (typeof b.projectId === "string" ? b.projectId : "") || (await getActiveProjectId());
  const plan = await createPlan(projectId, brief, channel, clampCount(b.count));
  return NextResponse.json(plan, { status: 201 });
}
