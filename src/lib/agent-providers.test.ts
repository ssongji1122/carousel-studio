import { describe, expect, it } from "vitest";
import { listAgentProviders } from "@/lib/agent-providers";

describe("agent providers", () => {
  it("checks providers in Claude, Codex, Cursor order", () => {
    expect(listAgentProviders().map((provider) => provider.id)).toEqual([
      "claude",
      "codex",
      "cursor",
    ]);
  });
});
