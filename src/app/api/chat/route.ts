import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt } from "@/lib/chat-system-prompt";
import { getCarousel } from "@/lib/carousels";
import {
  hasAvailableAgentProvider,
  isAgentChainError,
  runAgentWithFallback,
} from "@/lib/agent-providers";
import {
  getProjectContext,
  isProjectContextError,
  requireConfiguredProjectContext,
  type ProjectContext,
} from "@/lib/project-context";
import { getActiveProjectId } from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  if (!hasAvailableAgentProvider()) {
    return NextResponse.json(
      { error: "No AI agent provider found. Install Claude, Codex, or Cursor Agent CLI." },
      { status: 503 }
    );
  }

  let body: {
    message?: string;
    sessionId?: string;
    carouselId?: string;
    stylePresetId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { message, sessionId, carouselId, stylePresetId } = body;

  if (
    !message ||
    typeof message !== "string" ||
    !message.trim() ||
    message.length > 10000
  ) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }

  const carousel = carouselId ? await getCarousel(carouselId) : null;
  if (carouselId && !carousel) {
    return NextResponse.json({ error: "Carousel not found" }, { status: 404 });
  }

  let context: ProjectContext;
  try {
    context = requireConfiguredProjectContext(
      await getProjectContext(carousel?.projectId ?? (await getActiveProjectId()), {
        stylePresetId,
      })
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

  const baseUrl = new URL(request.url).origin;
  const systemPrompt = buildSystemPrompt(
    context.brand,
    carousel,
    context.stylePreset,
    baseUrl,
    context.creativeGuides
  );
  const encoder = new TextEncoder();
  const abortController = new AbortController();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await runAgentWithFallback({
          name: "carrusel-chat",
          userPrompt: message,
          systemPrompt,
          sessionId,
          cwd: process.cwd(),
          signal: abortController.signal,
          onToken: (text) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "token", text })}\n\n`)
            );
          },
          onResult: (text) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "result", text })}\n\n`)
            );
          },
          onProviderStart: (provider) => {
            controller.enqueue(
              encoder.encode(
                `event: provider\ndata: ${JSON.stringify({
                  provider: provider.id,
                  label: provider.label,
                })}\n\n`
              )
            );
          },
        });

        if (result.output) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "result", text: result.output })}\n\n`
            )
          );
        }
        controller.enqueue(
          encoder.encode(
            `event: done\ndata: ${JSON.stringify({
              sessionId: result.sessionId ?? "",
              provider: result.provider,
              attempts: result.attempts,
              exitCode: 0,
            })}\n\n`
          )
        );
        controller.close();
      } catch (error) {
        const payload = isAgentChainError(error)
          ? { error: error.message, attempts: error.attempts }
          : { error: error instanceof Error ? error.message : "AI agent failed" };
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${JSON.stringify(payload)}\n\n`)
        );
        controller.close();
      }
    },

    cancel() {
      abortController.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
