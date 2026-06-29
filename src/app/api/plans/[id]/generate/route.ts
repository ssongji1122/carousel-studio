import { NextRequest, NextResponse } from "next/server";
import {
  hasAvailableAgentProvider,
  isAgentChainError,
  runAgentWithFallback,
} from "@/lib/agent-providers";
import { getPlan } from "@/lib/plans";
import { buildPlannerPrompt } from "@/lib/plan-system-prompt";
import {
  getProjectContext,
  isProjectContextError,
  requireConfiguredProjectContext,
  type ProjectContext,
} from "@/lib/project-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!hasAvailableAgentProvider()) {
    return NextResponse.json(
      { error: "No AI agent provider found. Install Claude, Codex, or Cursor Agent CLI." },
      { status: 503 }
    );
  }

  const plan = await getPlan(id);
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  let context: ProjectContext;
  try {
    context = requireConfiguredProjectContext(
      await getProjectContext(plan.projectId)
    );
  } catch (error) {
    if (isProjectContextError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code, projectId: error.projectId },
        { status: error.status }
      );
    }
    throw error;
  }
  const prompt = buildPlannerPrompt(
    context.brand,
    plan,
    new URL(request.url).origin,
    context.creativeGuides
  );

  try {
    await runAgentWithFallback({
      name: "carrusel-plan",
      userPrompt: `시리즈 플랜 ${plan.id}의 필러와 주제 ${plan.count}개를 만들어 items API에 POST해줘.`,
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
    return NextResponse.json(
      { error: "Plan generation failed" },
      { status: 502 }
    );
  }

  const updated = await getPlan(id);
  return NextResponse.json(updated);
}
