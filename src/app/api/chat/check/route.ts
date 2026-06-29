import { NextResponse } from "next/server";
import { listAgentProviders } from "@/lib/agent-providers";

export async function GET() {
  const providers = listAgentProviders();
  return NextResponse.json({
    available: providers.some((provider) => provider.available),
    providers,
  });
}
