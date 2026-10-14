const DEFAULT_ORIGIN = "http://localhost:3000";

export function getRequestOrigin(request: Request): string {
  try {
    return new URL(request.url).origin;
  } catch {
    return DEFAULT_ORIGIN;
  }
}
