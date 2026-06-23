import { NextResponse } from "next/server";
import { getPlan, updatePlan, replacePlanItems, deletePlan } from "@/lib/plans";
import type { PlanItem } from "@/types/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const plan = await getPlan(id);
  return plan ? NextResponse.json(plan) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (Array.isArray(body.items)) {
    const plan = await replacePlanItems(id, body.items as PlanItem[]);
    return plan ? NextResponse.json(plan) : NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const updates: Record<string, unknown> = {};
  if (Array.isArray(body.pillars)) updates.pillars = body.pillars;
  if (typeof body.count === "number") updates.count = body.count;
  if (body.channel === "instagram" || body.channel === "threads") updates.channel = body.channel;
  const plan = await updatePlan(id, updates);
  return plan ? NextResponse.json(plan) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json({ ok: await deletePlan(id) });
}
