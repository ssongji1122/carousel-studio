import { NextRequest, NextResponse } from "next/server";
import { getPlan } from "@/lib/plans";
import { fanoutPlan } from "@/lib/plan-fanout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const plan = await getPlan(id);
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(await fanoutPlan(plan));
}
