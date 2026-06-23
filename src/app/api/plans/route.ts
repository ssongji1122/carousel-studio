import { NextResponse } from "next/server";
import { listPlans, createPlan } from "@/lib/plans";
import { validateBrief, clampCount } from "@/lib/plan-input";
import type { Channel } from "@/types/carousel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ plans: await listPlans() });
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const brief = validateBrief(body);
  if (!brief) return NextResponse.json({ error: "scope/target required" }, { status: 400 });
  const b = body as Record<string, unknown>;
  const channel: Channel = b.channel === "threads" ? "threads" : "instagram";
  const plan = await createPlan(brief, channel, clampCount(b.count));
  return NextResponse.json(plan, { status: 201 });
}
