export function validateBrief(body: unknown): { scope: string; target: string } | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  const scope = b.scope, target = b.target;
  if (typeof scope !== "string" || !scope.trim()) return null;
  if (typeof target !== "string" || !target.trim()) return null;
  return { scope: scope.trim(), target: target.trim() };
}

export function clampCount(n: unknown): number {
  const num = typeof n === "string" ? parseInt(n, 10) : typeof n === "number" ? n : NaN;
  if (!Number.isFinite(num)) return 6;
  return Math.min(12, Math.max(1, Math.trunc(num)));
}

export function validateItem(body: unknown): { pillar: string; topic: string } | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  const pillar = b.pillar, topic = b.topic;
  if (typeof pillar !== "string" || !pillar.trim()) return null;
  if (typeof topic !== "string" || !topic.trim()) return null;
  return { pillar: pillar.trim(), topic: topic.trim() };
}
