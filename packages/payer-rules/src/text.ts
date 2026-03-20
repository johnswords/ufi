const namedEntities: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  ndash: "-",
  mdash: "-",
  quot: "\"",
  rsquo: "'",
  lsquo: "'",
  rsquor: "'",
  ldquo: "\"",
  rdquo: "\"",
  ge: ">=",
  le: "<=",
  middot: " ",
  hellip: "...",
  sol: "/",
  copy: "(c)",
  reg: "(r)",
  sect: "section"
};

function decodeEntity(entity: string): string {
  const normalized = entity.toLowerCase();
  if (normalized.startsWith("#x")) {
    const parsed = Number.parseInt(normalized.slice(2), 16);
    return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : `&${entity};`;
  }

  if (normalized.startsWith("#")) {
    const parsed = Number.parseInt(normalized.slice(1), 10);
    return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : `&${entity};`;
  }

  return namedEntities[normalized] ?? `&${entity};`;
}

export function decodeHtmlEntities(value: string): string {
  let decoded = value;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const next = decoded.replace(/&([a-z0-9#]+);/giu, (_, entity: string) => decodeEntity(entity));
    if (next === decoded) {
      return next;
    }

    decoded = next;
  }

  return decoded;
}

function stripTags(value: string): string {
  return value
    .replace(/<\s*br\s*\/?>/giu, "\n")
    .replace(/<\s*\/p\s*>/giu, "\n")
    .replace(/<\s*p[^>]*>/giu, "\n")
    .replace(/<\s*li[^>]*>/giu, "\n")
    .replace(/<\s*\/li\s*>/giu, "")
    .replace(/<\s*\/?(?:ul|ol|div|strong|em|sup)[^>]*>/giu, " ")
    .replace(/<[^>]+>/gu, " ");
}

export function htmlToPlainText(value: string): string {
  return stripTags(decodeHtmlEntities(value))
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function htmlToSegments(value: string): string[] {
  return htmlToPlainText(value)
    .split(/\n+/u)
    .map((segment) => segment.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export function normalizeNarrativeText(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
}
