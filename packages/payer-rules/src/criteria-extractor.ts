import type { PayerRuleCriterion } from "@ufi/shared";

const decodeMap: Record<string, string> = {
  "&lt;": "<",
  "&gt;": ">",
  "&amp;": "&",
  "&sol;": "/",
  "&quot;": "\"",
  "&#39;": "'",
  "&rsquo;": "'",
  "&nbsp;": " ",
  "&ge;": "≥",
  "&le;": "≤",
  "&ndash;": "-",
  "&mdash;": "-"
};

function decodeEntities(value: string): string {
  return value.replace(
    /&lt;|&gt;|&amp;|&sol;|&quot;|&#39;|&rsquo;|&nbsp;|&ge;|&le;|&ndash;|&mdash;/g,
    (match) => decodeMap[match] ?? match
  );
}

export function normalizeCmsText(value: string): string {
  return decodeEntities(value)
    .replace(/<br\s*\/?>/giu, "\n")
    .replace(/<\/p>/giu, "\n")
    .replace(/<li>/giu, "- ")
    .replace(/<\/li>/giu, "\n")
    .replace(/<\/?(?:ul|ol|div|strong|em|span|sup)[^>]*>/giu, " ")
    .replace(/<[^>]+>/gu, " ")
    .replace(/\r/gu, " ")
    .replace(/[ \t]+\n/gu, "\n")
    .replace(/\n{2,}/gu, "\n")
    .replace(/[ \t]{2,}/gu, " ")
    .trim();
}

function splitSegments(text: string): string[] {
  return text
    .split(/\n+/u)
    .flatMap((line) => line.split(/(?<=[.;:])\s+(?=[A-Z0-9])/u))
    .map((segment) => segment.trim())
    .filter((segment) => segment.length >= 12);
}

function parseComparator(raw: string): ">=" | "<=" | ">" | "<" | "==" {
  switch (raw) {
    case "≥":
      return ">=";
    case "≤":
      return "<=";
    case "=":
      return "==";
    default:
      return raw as ">=" | "<=" | ">" | "<" | "==";
  }
}

function uniqueCriteria(criteria: PayerRuleCriterion[]): PayerRuleCriterion[] {
  const seen = new Set<string>();
  const result: PayerRuleCriterion[] = [];

  for (const criterion of criteria) {
    const key = JSON.stringify(criterion);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(criterion);
  }

  return result;
}

export function extractCriteriaFromCmsTexts(texts: string[]): PayerRuleCriterion[] {
  const criteria: PayerRuleCriterion[] = [];

  for (const text of texts.map(normalizeCmsText).filter(Boolean)) {
    for (const segment of splitSegments(text)) {
      const segmentCriteria = extractCriteriaFromSegment(segment);
      if (segmentCriteria.length > 0) {
        criteria.push(...segmentCriteria);
      } else {
        criteria.push({
          type: "narrative",
          text: segment
        });
      }
    }
  }

  if (criteria.length === 0 && texts.some((text) => text.trim().length > 0)) {
    return [
      {
        type: "narrative",
        text: texts.map(normalizeCmsText).filter(Boolean).join("\n")
      }
    ];
  }

  return uniqueCriteria(criteria);
}

function extractCriteriaFromSegment(segment: string): PayerRuleCriterion[] {
  const criteria: PayerRuleCriterion[] = [];
  const thresholdPattern =
    /\b(BMI|body mass index|blood pressure|pain score|HbA1c|A1c)\b[^0-9<>≥≤=]{0,24}(>=|<=|>|<|=|≥|≤)\s*(\d+(?:\.\d+)?)\s*([A-Za-z/%0-9.-]+)?/giu;

  for (const match of segment.matchAll(thresholdPattern)) {
    const measure = match[1];
    const operator = match[2];
    const value = match[3];
    if (!measure || !operator || !value) {
      continue;
    }

    criteria.push({
      type: "threshold",
      measure: measure.trim(),
      operator: parseComparator(operator),
      value: Number(value),
      unit: match[4]?.trim() || undefined
    });
  }

  const bmiAtLeastPattern = /\bBMI\b[^0-9]{0,20}(?:>=|≥|greater than or equal to|at least)\s*(\d+(?:\.\d+)?)/iu;
  const bmiMatch = segment.match(bmiAtLeastPattern);
  if (bmiMatch) {
    criteria.push({
      type: "threshold",
      measure: "BMI",
      operator: ">=",
      value: Number(bmiMatch[1])
    });
  }

  if (
    /previously unsuccessful with medical treatment for obesity|failed to maintain a healthy weight|diligent effort to achieve healthy body weight/iu.test(
      segment
    )
  ) {
    criteria.push({
      type: "failed_treatment",
      treatment: "medical treatment for obesity"
    });
  }

  const durationFailurePattern =
    /\bfailed(?:\s+at\s+least)?\s+(\d+)\s+weeks?\s+of\s+([A-Za-z0-9 /()-]+)/iu;
  const failureMatch = segment.match(durationFailurePattern);
  if (failureMatch?.[1] && failureMatch[2]) {
    criteria.push({
      type: "failed_treatment",
      treatment: failureMatch[2].trim().replace(/[.;:]$/u, ""),
      durationWeeks: Number(failureMatch[1])
    });
  }

  if (/medical record|documentation|documented|certified by the operating surgeon|clearance/iu.test(segment)) {
    criteria.push({
      type: "documentation_required",
      description: segment
    });
  }

  if (/co-?morb/i.test(segment)) {
    const listMatch = segment.match(/\((?:e\.g\.,?\s*)?([^)]+)\)/iu);
    const conditions = (listMatch?.[1] ?? segment)
      .split(/,|;|\bor\b|\band\b/iu)
      .map((condition) => condition.replace(/^[^A-Za-z]+/u, "").trim())
      .filter((condition) => condition.length > 2)
      .filter((condition) => !/co-?morb|medical record|beneficiar|medicare|condition/i.test(condition));

    if (conditions.length > 0) {
      criteria.push({
        type: "comorbidity",
        conditions
      });
    }
  }

  const icd10Pattern = /\b[A-TV-Z][0-9][0-9AB](?:\.[A-Z0-9]{1,4})?\b/gu;
  const icdCodes = Array.from(segment.matchAll(icd10Pattern), (match) => match[0]);
  if (icdCodes.length > 0) {
    criteria.push({
      type: "diagnosis_required",
      icd10Codes: [...new Set(icdCodes)]
    });
  }

  return uniqueCriteria(criteria);
}
