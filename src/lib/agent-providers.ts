import fs from "fs";
import os from "os";
import path from "path";
import { spawn, spawnSync } from "child_process";
import crossSpawn from "cross-spawn";
import { findClaudePath } from "@/lib/claude-path";

export type AgentProviderId = "claude" | "codex" | "cursor";

export interface AgentProviderStatus {
  id: AgentProviderId;
  label: string;
  available: boolean;
  path: string | null;
  reason?: string;
}

export interface AgentAttempt {
  provider: AgentProviderId;
  label: string;
  status: "skipped" | "failed" | "succeeded";
  reason?: string;
  exitCode?: number | null;
}

export interface AgentRunOptions {
  name: string;
  userPrompt: string;
  systemPrompt: string;
  sessionId?: string;
  cwd?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  claudeAllowedTools?: string[];
  onToken?: (token: string) => void;
  onResult?: (text: string) => void;
  onProviderStart?: (provider: AgentProviderStatus) => void;
}

export interface AgentRunResult {
  provider: AgentProviderId;
  label: string;
  output: string;
  sessionId?: string;
  attempts: AgentAttempt[];
}

export class AgentRunError extends Error {
  readonly provider: AgentProviderId;
  readonly label: string;
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly fallbackable: boolean;

  constructor(params: {
    provider: AgentProviderId;
    label: string;
    message: string;
    exitCode?: number | null;
    stdout?: string;
    stderr?: string;
    fallbackable?: boolean;
  }) {
    super(params.message);
    this.name = "AgentRunError";
    this.provider = params.provider;
    this.label = params.label;
    this.exitCode = params.exitCode ?? null;
    this.stdout = params.stdout ?? "";
    this.stderr = params.stderr ?? "";
    this.fallbackable = params.fallbackable ?? false;
  }
}

export class AgentChainError extends Error {
  readonly attempts: AgentAttempt[];
  readonly status = 502;

  constructor(message: string, attempts: AgentAttempt[]) {
    super(message);
    this.name = "AgentChainError";
    this.attempts = attempts;
  }
}

const PROVIDER_LABELS: Record<AgentProviderId, string> = {
  claude: "Claude",
  codex: "Codex",
  cursor: "Cursor",
};

const LIMIT_PATTERNS = [
  /usage limit/i,
  /weekly limit/i,
  /rate limit/i,
  /rate_limit/i,
  /limit reached/i,
  /quota/i,
  /credit balance/i,
  /too many requests/i,
  /subscription/i,
  /exceeded/i,
  /\b429\b/,
];

interface ProcessState {
  output: string;
  rawStdout: string;
  sessionId?: string;
  providerError?: string;
  providerErrorFallbackable?: boolean;
}

export function listAgentProviders(): AgentProviderStatus[] {
  const claude = findClaudePath();
  const codex = findCodexPath();
  const cursor = findCursorAgentPath();

  return [
    {
      id: "claude",
      label: PROVIDER_LABELS.claude,
      available: Boolean(claude),
      path: claude,
      reason: claude ? undefined : "Claude CLI not found",
    },
    {
      id: "codex",
      label: PROVIDER_LABELS.codex,
      available: Boolean(codex),
      path: codex,
      reason: codex ? undefined : "Codex CLI not found",
    },
    {
      id: "cursor",
      label: PROVIDER_LABELS.cursor,
      available: Boolean(cursor),
      path: cursor,
      reason: cursor ? undefined : "Cursor Agent CLI not found",
    },
  ];
}

export function hasAvailableAgentProvider(): boolean {
  return listAgentProviders().some((provider) => provider.available);
}

export function isAgentChainError(error: unknown): error is AgentChainError {
  return error instanceof AgentChainError;
}

export async function runAgentWithFallback(
  options: AgentRunOptions
): Promise<AgentRunResult> {
  const providers = listAgentProviders();
  const attempts: AgentAttempt[] = [];

  for (const provider of providers) {
    if (!provider.available || !provider.path) {
      attempts.push({
        provider: provider.id,
        label: provider.label,
        status: "skipped",
        reason: provider.reason,
      });
      continue;
    }

    options.onProviderStart?.(provider);

    try {
      const result = await runProvider(provider, options);
      attempts.push({
        provider: provider.id,
        label: provider.label,
        status: "succeeded",
        exitCode: 0,
      });
      return { ...result, attempts };
    } catch (error) {
      if (!(error instanceof AgentRunError)) throw error;
      attempts.push({
        provider: provider.id,
        label: provider.label,
        status: "failed",
        reason: error.message,
        exitCode: error.exitCode,
      });
      if (!error.fallbackable) {
        throw new AgentChainError(error.message, attempts);
      }
    }
  }

  throw new AgentChainError("No available AI agent provider completed the task.", attempts);
}

async function runProvider(
  provider: AgentProviderStatus,
  options: AgentRunOptions
): Promise<Omit<AgentRunResult, "attempts">> {
  if (!provider.path) {
    throw new AgentRunError({
      provider: provider.id,
      label: provider.label,
      message: `${provider.label} is not available.`,
      fallbackable: true,
    });
  }

  if (provider.id === "claude") {
    return runClaude(provider, options);
  }
  if (provider.id === "codex") {
    return runCodex(provider, options);
  }
  return runCursor(provider, options);
}

async function runClaude(
  provider: AgentProviderStatus,
  options: AgentRunOptions
): Promise<Omit<AgentRunResult, "attempts">> {
  const allowedTools = options.claudeAllowedTools ?? ["Bash", "WebFetch", "Read"];
  const args = [
    "-p",
    options.userPrompt,
    "--output-format",
    "stream-json",
    "--include-partial-messages",
    "--verbose",
    "--append-system-prompt",
    options.systemPrompt,
    ...allowedTools.flatMap((tool) => ["--allowedTools", tool]),
    "--max-budget-usd",
    "1.00",
    "--name",
    options.name,
  ];

  if (options.sessionId) args.push("--resume", options.sessionId);

  return runProcess(provider, args, options, {
    parseStdoutLine: (line, state) => {
      if (!line.trim()) return;
      try {
        const event = JSON.parse(line) as Record<string, unknown>;
        const eventText = JSON.stringify(event);
        if (event.type === "rate_limit_event") {
          state.providerError = `${provider.label} hit a usage limit. Trying the next provider.`;
          state.providerErrorFallbackable = true;
          return;
        }
        if (event.error === "rate_limit" || event.api_error_status === 429) {
          state.providerError = `${provider.label} hit a usage limit. Trying the next provider.`;
          state.providerErrorFallbackable = true;
          return;
        }
        if (
          event.type === "system" &&
          event.subtype === "init" &&
          typeof event.session_id === "string"
        ) {
          state.sessionId = event.session_id;
          return;
        }
        if (event.type === "assistant" && event.message) {
          const msg = event.message as Record<string, unknown>;
          if (msg.type === "message" && Array.isArray(msg.content)) {
            for (const block of msg.content) {
              const b = block as Record<string, unknown>;
              if (b.type === "text" && typeof b.text === "string") {
                state.output += b.text;
                options.onToken?.(b.text);
              }
            }
          }
          return;
        }
        if (event.type === "result") {
          if (typeof event.session_id === "string") {
            state.sessionId = event.session_id;
          }
          if (event.is_error === true) {
            const message =
              typeof event.result === "string" && event.result
                ? event.result
                : `${provider.label} returned an error.`;
            state.providerError = message;
            state.providerErrorFallbackable = isFallbackableAgentFailure(eventText);
            return;
          }
          if (typeof event.result === "string" && event.result) {
            state.output = event.result;
            options.onResult?.(event.result);
          }
        }
      } catch {
        state.rawStdout += line + "\n";
      }
    },
  });
}

async function runCodex(
  provider: AgentProviderStatus,
  options: AgentRunOptions
): Promise<Omit<AgentRunResult, "attempts">> {
  const args = [
    "exec",
    "--cd",
    options.cwd ?? process.cwd(),
    "--dangerously-bypass-approvals-and-sandbox",
    "--skip-git-repo-check",
    "--ephemeral",
    "--ignore-user-config",
    "--ignore-rules",
    "--color",
    "never",
    "-o",
    outputPath(),
    "-",
  ];
  const prompt = buildFallbackPrompt(options);
  const outFile = args[args.length - 2];
  return runProcess(provider, args, options, { stdin: prompt, outputFile: outFile });
}

async function runCursor(
  provider: AgentProviderStatus,
  options: AgentRunOptions
): Promise<Omit<AgentRunResult, "attempts">> {
  const args = [
    "--print",
    "--output-format",
    "text",
    "--force",
    "--trust",
    "--sandbox",
    "disabled",
    "--workspace",
    options.cwd ?? process.cwd(),
    buildFallbackPrompt(options),
  ];
  return runProcess(provider, args, options);
}

function runProcess(
  provider: AgentProviderStatus,
  args: string[],
  options: AgentRunOptions,
  hooks: {
    stdin?: string;
    outputFile?: string;
    parseStdoutLine?: (
      line: string,
      state: ProcessState
    ) => void;
  } = {}
): Promise<Omit<AgentRunResult, "attempts">> {
  const executable = provider.path;
  if (!executable) {
    throw new AgentRunError({
      provider: provider.id,
      label: provider.label,
      message: `${provider.label} is not available.`,
      fallbackable: true,
    });
  }

  return new Promise((resolve, reject) => {
    const isWindowsShim =
      process.platform === "win32" && /\.(cmd|bat)$/i.test(executable);
    const spawner = isWindowsShim ? crossSpawn : spawn;
    const state: ProcessState = {
      output: "",
      rawStdout: "",
      sessionId: options.sessionId,
    };
    let stderr = "";
    let buffer = "";

    const child = spawner(executable, args, {
      cwd: options.cwd ?? process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
    });

    const timeout = setTimeout(() => {
      child.kill();
    }, options.timeoutMs ?? 480_000);
    const abort = () => child.kill();
    if (options.signal?.aborted) abort();
    options.signal?.addEventListener("abort", abort, { once: true });

    const cleanup = () => {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abort);
    };

    child.stdout?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      if (!hooks.parseStdoutLine) {
        state.output += text;
        return;
      }
      buffer += text;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        hooks.parseStdoutLine(line, state);
      }
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      stderr = (stderr + chunk.toString()).slice(-16000);
    });

    child.on("error", (error) => {
      cleanup();
      reject(
        new AgentRunError({
          provider: provider.id,
          label: provider.label,
          message: `${provider.label} failed to start: ${error.message}`,
          stderr,
          fallbackable: true,
        })
      );
    });

    child.on("close", (code) => {
      cleanup();
      if (hooks.parseStdoutLine && buffer.trim()) {
        hooks.parseStdoutLine(buffer, state);
      }
      const fileOutput = readOutputFile(hooks.outputFile);
      const output = fileOutput || state.output.trim() || state.rawStdout.trim();
      if (state.providerError) {
        reject(
          new AgentRunError({
            provider: provider.id,
            label: provider.label,
            message: state.providerErrorFallbackable
              ? `${provider.label} hit a usage limit. Trying the next provider.`
              : state.providerError,
            exitCode: code,
            stdout: state.output || state.rawStdout,
            stderr,
            fallbackable: Boolean(state.providerErrorFallbackable),
          })
        );
        return;
      }
      if (code === 0) {
        resolve({
          provider: provider.id,
          label: provider.label,
          output,
          sessionId: state.sessionId,
        });
        return;
      }
      const combined = `${state.output}\n${state.rawStdout}\n${stderr}`;
      const fallbackable =
        provider.id !== "cursor" || isFallbackableAgentFailure(combined);
      reject(
        new AgentRunError({
          provider: provider.id,
          label: provider.label,
          message: fallbackable
            ? `${provider.label} hit a usage limit. Trying the next provider.`
            : `${provider.label} exited with code ${code}.`,
          exitCode: code,
          stdout: state.output || state.rawStdout,
          stderr,
          fallbackable,
        })
      );
    });

    if (hooks.stdin !== undefined) {
      child.stdin?.end(hooks.stdin);
    } else {
      child.stdin?.end();
    }
  });
}

function buildFallbackPrompt(options: AgentRunOptions): string {
  return `${options.systemPrompt}

## User request
${options.userPrompt}

## Provider fallback constraints
- You are running as a fallback agent inside Carousel Studio.
- Use the API endpoints from the system prompt to make changes.
- Do not edit application source files.
- Do not run destructive git commands.
- Keep the final response brief.`;
}

function outputPath(): string {
  return path.join(
    os.tmpdir(),
    `carousel-agent-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`
  );
}

function readOutputFile(file?: string): string {
  if (!file) return "";
  try {
    const output = fs.readFileSync(file, "utf-8").trim();
    fs.unlinkSync(file);
    return output;
  } catch {
    return "";
  }
}

function isFallbackableAgentFailure(output: string): boolean {
  return LIMIT_PATTERNS.some((pattern) => pattern.test(output));
}

function findCodexPath(): string | null {
  return findExecutable("CODEX_CLI_PATH", "codex", [
    "/Applications/Codex.app/Contents/Resources/codex",
    path.join(os.homedir(), ".local/bin/codex"),
    "/opt/homebrew/bin/codex",
    "/usr/local/bin/codex",
  ]);
}

function findCursorAgentPath(): string | null {
  return findExecutable("CURSOR_AGENT_PATH", "cursor-agent", [
    path.join(os.homedir(), ".local/bin/cursor-agent"),
    "/opt/homebrew/bin/cursor-agent",
    "/usr/local/bin/cursor-agent",
  ]);
}

function findExecutable(
  envName: string,
  binName: string,
  candidates: string[]
): string | null {
  const envValue = process.env[envName];
  if (envValue && fs.existsSync(envValue)) return envValue;

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  try {
    const result = spawnSync(
      process.platform === "win32" ? "where" : "command",
      process.platform === "win32" ? [binName] : ["-v", binName],
      {
        encoding: "utf-8",
        shell: process.platform !== "win32",
        timeout: 2000,
      }
    );
    if (result.status === 0 && result.stdout) {
      const first = result.stdout.split(/\r?\n/).find((line) => line.trim());
      if (first && fs.existsSync(first.trim())) return first.trim();
    }
  } catch {
    return null;
  }

  return null;
}
