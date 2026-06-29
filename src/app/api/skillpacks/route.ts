import { NextResponse } from "next/server";
import {
  groupSkillpacksByStage,
  listExternalSkillpacks,
  validateSkillpackRegistry,
} from "@/lib/external-skillpacks";
import type { SkillpackStage } from "@/types/external-skillpack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const stage = new URL(request.url).searchParams.get("stage") as SkillpackStage | null;
  const issues = validateSkillpackRegistry();
  return NextResponse.json({
    ok: issues.length === 0,
    issues,
    skillpacks: listExternalSkillpacks(stage ?? undefined),
    grouped: groupSkillpacksByStage(),
  });
}
