interface StreamChatParams {
  message: string;
  sessionId: string | null;
  carouselId: string;
  signal: AbortSignal;
  onText: (text: string) => void;
  onSessionId: (sessionId: string) => void;
}

interface ChatStreamEvent {
  type?: "token" | "result";
  text?: string;
  sessionId?: string;
}

interface ErrorPayload {
  error?: string;
}

export async function streamChatResponse({
  message,
  sessionId,
  carouselId,
  signal,
  onText,
  onSessionId,
}: StreamChatParams) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId, carouselId }),
    signal,
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => ({}))) as ErrorPayload;
    throw new Error(errorPayload.error || "Failed to connect to AI");
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response stream");

  const decoder = new TextDecoder();
  let accumulated = "";
  let buffer = "";

  const readLine = (line: string) => {
    if (!line.startsWith("data: ")) return;
    const data = parseEvent(line.slice(6));
    if (!data) return;
    if (typeof data.sessionId === "string") onSessionId(data.sessionId);
    if (data.type === "token" && typeof data.text === "string") {
      accumulated += data.text;
      onText(accumulated);
    }
    if (data.type === "result" && typeof data.text === "string") {
      accumulated = data.text;
      onText(accumulated);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) readLine(line);
  }

  if (buffer.trim()) {
    for (const line of buffer.split("\n")) readLine(line);
  }
}

function parseEvent(raw: string): ChatStreamEvent | null {
  try {
    return JSON.parse(raw) as ChatStreamEvent;
  } catch {
    return null;
  }
}
