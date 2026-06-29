const TOOL_BRAND_REFERENCE_PATTERNS: readonly RegExp[] = [
  /STUDIO\.SOLUTA/g,
  /studio\.soluta/gi,
  /studio soluta/gi,
];

const TOOL_BRAND_REPLACEMENT = "제작 도구";

export function sanitizeToolBrandReferences(text: string): string {
  return TOOL_BRAND_REFERENCE_PATTERNS.reduce(
    (current, pattern) => current.replace(pattern, TOOL_BRAND_REPLACEMENT),
    text
  );
}

export function sanitizeToolBrandReferenceList(
  items: readonly string[] | undefined
): string[] {
  return (items ?? []).map(sanitizeToolBrandReferences);
}
