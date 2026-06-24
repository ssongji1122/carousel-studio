import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import crossSpawn from "cross-spawn";
import { getClaudePath, isClaudeAvailable } from "@/lib/claude-path";
import { getPlan } from "@/lib/plans";
import { resolveBrandForPlan } from "@/lib/resolve-brand";
import { buildPlannerPrompt } from "@/lib/plan-system-prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isClaudeAvailable()) {
    return NextResponse.json({ error: "Claude CLI not found" }, { status: 503 });
  }

  const plan = await getPlan(id);
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const brand = await resolveBrandForPlan(id);
  const prompt = buildPlannerPrompt(brand, plan);

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
          `시리즈 플랜 ${plan.id}의 필러와 주제 ${plan.count}개를 만들어 items API에 POST해줘.`,
          "--append-system-prompt",
          prompt,
          "--allowedTools",
          "Bash",
          "--max-budget-usd",
          "1.00",
          "--name",
          "carrusel-plan",
        ],
        {
          cwd: process.cwd(),
          stdio: "ignore",
        }
      );
      child.on("error", reject);
      child.on("close", (code) =>
        code === 0
          ? resolve()
          : reject(new Error("Claude CLI exited " + code))
      );
    });
  } catch {
    return NextResponse.json(
      { error: "Plan generation failed" },
      { status: 502 }
    );
  }

  const updated = await getPlan(id);
  return NextResponse.json(updated);
}
