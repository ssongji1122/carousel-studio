import { NextResponse } from "next/server";
import { addPlanItem } from "@/lib/plans";
import { validateItem } from "@/lib/plan-input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const item = validateItem(body);
  if (!item) return NextResponse.json({ error: "pillar/topic required" }, { status: 400 });
  const plan = await addPlanItem(id, item);
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  return NextResponse.json(plan, { status: 201 });
}
