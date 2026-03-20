import type {
  ClinicalEvidenceItem,
  MissingCriteriaItem,
  PayerRule,
  PayerRuleCriterion,
  PayerTransparencyMetrics,
  PredictionResult,
  StructuredCriteria
} from "@ufi/shared";

const APPROVED_THRESHOLD = 0.8;
const NEEDS_DOCS_THRESHOLD = 0.4;

export function predictOutcome(
  criteria: StructuredCriteria,
  rules: PayerRule[],
  metrics?: PayerTransparencyMetrics
): PredictionResult {
  if (rules.length === 0) {
    return {
      verdict: "needs-documentation",
      confidence: 0.3,
      reasoning: ["No matching payer rules found for this CPT code and carrier. Manual review required."],
      missingCriteria: []
    };
  }

  let bestScore = -1;
  let bestResult: PredictionResult = evaluateRule(criteria, rules[0] as PayerRule).prediction;

  for (const rule of rules) {
    const result = evaluateRule(criteria, rule);
    if (result.matchScore > bestScore) {
      bestScore = result.matchScore;
      bestResult = result.prediction;
    }
  }

  if (metrics) {
    const adjustedConfidence = Math.round(bestResult.confidence * (0.7 + 0.3 * metrics.approvalRate) * 100) / 100;
    const approvalPct = Math.round(metrics.approvalRate * 100);
    const categoryNote = metrics.serviceCategory ? ` for ${metrics.serviceCategory} procedures` : "";
    bestResult = {
      ...bestResult,
      confidence: Math.min(adjustedConfidence, 1),
      reasoning: [
        ...bestResult.reasoning,
        `Adjusted by ${metrics.payer} transparency data (${metrics.reportingPeriod}): ${approvalPct}% approval rate${categoryNote}.`
      ]
    };
  }

  return bestResult;
}

interface RuleEvaluation {
  readonly matchScore: number;
  readonly prediction: PredictionResult;
}

function evaluateRule(criteria: StructuredCriteria, rule: PayerRule): RuleEvaluation {
  const checkable: PayerRuleCriterion[] = [];
  const narratives: PayerRuleCriterion[] = [];

  for (const criterion of rule.criteria) {
    if (criterion.type === "narrative") {
      narratives.push(criterion);
    } else {
      checkable.push(criterion);
    }
  }

  if (checkable.length === 0) {
    return {
      matchScore: 0,
      prediction: {
        verdict: "needs-documentation",
        confidence: 0.2,
        reasoning: [`Rule "${rule.title}" contains only narrative criteria that require manual review.`],
        missingCriteria: narratives.map((n) => ({
          description: n.type === "narrative" ? n.text : "Unknown narrative criterion",
          ruleType: "narrative",
          severity: "required" as const
        }))
      }
    };
  }

  const matched: PayerRuleCriterion[] = [];
  const unmatched: PayerRuleCriterion[] = [];
  const reasoning: string[] = [];

  for (const criterion of checkable) {
    const result = matchCriterion(criterion, criteria);
    if (result.matched) {
      matched.push(criterion);
      reasoning.push(`[MET] ${result.detail}`);
    } else {
      unmatched.push(criterion);
      reasoning.push(`[MISSING] ${result.detail}`);
    }
  }

  if (narratives.length > 0) {
    reasoning.push(`${narratives.length} narrative criterion/criteria require manual review.`);
  }

  const matchScore = matched.length / checkable.length;

  const missingCriteria: MissingCriteriaItem[] = unmatched.map((c) => ({
    description: describeCriterion(c),
    ruleType: c.type,
    severity: "required" as const
  }));

  // Match clarity: how definitively criteria match or don't.
  // A score near 0.5 is ambiguous; scores near 0 or 1 are clear.
  const matchClarity = Math.abs(matchScore - 0.5) * 2;
  const confidence = Math.round(criteria.extractionConfidence * (0.5 + matchClarity * 0.5) * 100) / 100;

  let verdict: PredictionResult["verdict"];
  if (matchScore >= APPROVED_THRESHOLD) {
    verdict = "approved";
  } else if (matchScore >= NEEDS_DOCS_THRESHOLD) {
    verdict = "needs-documentation";
  } else {
    verdict = "denied";
  }

  reasoning.unshift(
    `Evaluated against "${rule.title}" (${rule.payer}): ${matched.length}/${checkable.length} checkable criteria met (${Math.round(matchScore * 100)}%).`
  );

  return {
    matchScore,
    prediction: {
      verdict,
      confidence: Math.min(confidence, 1),
      reasoning,
      missingCriteria
    }
  };
}

interface MatchResult {
  readonly matched: boolean;
  readonly detail: string;
}

function matchCriterion(criterion: PayerRuleCriterion, criteria: StructuredCriteria): MatchResult {
  switch (criterion.type) {
    case "threshold":
      return matchThreshold(criterion, criteria.clinicalEvidence);
    case "failed_treatment":
      return matchFailedTreatment(criterion, criteria.clinicalEvidence);
    case "comorbidity":
      return matchComorbidity(criterion, criteria.clinicalEvidence);
    case "documentation_required":
      return matchDocumentation(criterion, criteria.clinicalEvidence);
    case "diagnosis_required":
      return matchDiagnosis(criterion, criteria.icdCodes);
    case "narrative":
      return { matched: false, detail: criterion.text };
  }
}

function matchThreshold(
  criterion: Extract<PayerRuleCriterion, { type: "threshold" }>,
  evidence: readonly ClinicalEvidenceItem[]
): MatchResult {
  const measureLower = criterion.measure.toLowerCase();

  for (const item of evidence) {
    if (item.type !== "threshold" || item.value === undefined) continue;

    const descLower = item.description.toLowerCase();
    // Check if the evidence description relates to the same measure
    if (!termsOverlap(measureLower, descLower)) continue;

    const meets = evaluateOperator(item.value, criterion.operator, criterion.value);
    if (meets) {
      return {
        matched: true,
        detail: `${criterion.measure}: found value ${item.value}${item.unit ? ` ${item.unit}` : ""} (required ${criterion.operator} ${criterion.value})`
      };
    }

    return {
      matched: false,
      detail: `${criterion.measure}: found value ${item.value} but required ${criterion.operator} ${criterion.value}`
    };
  }

  return {
    matched: false,
    detail: `${criterion.measure}: no matching evidence found (required ${criterion.operator} ${criterion.value})`
  };
}

function matchFailedTreatment(
  criterion: Extract<PayerRuleCriterion, { type: "failed_treatment" }>,
  evidence: readonly ClinicalEvidenceItem[]
): MatchResult {
  const treatmentLower = criterion.treatment.toLowerCase();

  for (const item of evidence) {
    if (item.type !== "failed_treatment") continue;

    const descLower = item.description.toLowerCase();
    if (!termsOverlap(treatmentLower, descLower)) continue;

    if (criterion.durationWeeks !== undefined) {
      if (item.durationWeeks === undefined) {
        return {
          matched: false,
          detail: `Failed treatment "${criterion.treatment}": found but duration not documented (required >= ${criterion.durationWeeks} weeks)`
        };
      }
      if (item.durationWeeks < criterion.durationWeeks) {
        return {
          matched: false,
          detail: `Failed treatment "${criterion.treatment}": duration ${item.durationWeeks} weeks < required ${criterion.durationWeeks} weeks`
        };
      }
    }

    return {
      matched: true,
      detail: `Failed treatment: "${item.description}"${item.durationWeeks !== undefined ? ` (${item.durationWeeks} weeks)` : ""}`
    };
  }

  return {
    matched: false,
    detail: `Failed treatment not documented: "${criterion.treatment}"${criterion.durationWeeks !== undefined ? ` (>= ${criterion.durationWeeks} weeks required)` : ""}`
  };
}

function matchComorbidity(
  criterion: Extract<PayerRuleCriterion, { type: "comorbidity" }>,
  evidence: readonly ClinicalEvidenceItem[]
): MatchResult {
  const comorbidityEvidence = evidence.filter((e) => e.type === "comorbidity");

  for (const required of criterion.conditions) {
    const requiredLower = required.toLowerCase();
    for (const item of comorbidityEvidence) {
      if (termsOverlap(requiredLower, item.description.toLowerCase())) {
        return {
          matched: true,
          detail: `Comorbidity matched: "${item.description}" satisfies "${required}"`
        };
      }
    }
  }

  return {
    matched: false,
    detail: `No documented comorbidity matching any of: ${criterion.conditions.join(", ")}`
  };
}

function matchDocumentation(
  criterion: Extract<PayerRuleCriterion, { type: "documentation_required" }>,
  evidence: readonly ClinicalEvidenceItem[]
): MatchResult {
  const reqLower = criterion.description.toLowerCase();
  const reqTerms = extractKeyTerms(reqLower);

  let bestOverlap = 0;
  let bestItem: ClinicalEvidenceItem | undefined;

  for (const item of evidence) {
    const descLower = item.description.toLowerCase();
    const itemTerms = extractKeyTerms(descLower);
    const overlap = countTermOverlap(reqTerms, itemTerms);
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      bestItem = item;
    }
  }

  // Require at least 30% of the key terms to overlap for a fuzzy match
  const overlapRatio = reqTerms.length > 0 ? bestOverlap / reqTerms.length : 0;

  if (overlapRatio >= 0.3 && bestItem) {
    return {
      matched: true,
      detail: `Documentation found: "${bestItem.description}" relates to "${criterion.description}"`
    };
  }

  return {
    matched: false,
    detail: `Documentation not found: "${criterion.description}"`
  };
}

function matchDiagnosis(
  criterion: Extract<PayerRuleCriterion, { type: "diagnosis_required" }>,
  icdCodes: readonly string[]
): MatchResult {
  const normalizedExtracted = icdCodes.map((c) => c.toUpperCase().replace(/\./g, ""));

  for (const required of criterion.icd10Codes) {
    const normalizedRequired = required.toUpperCase().replace(/\./g, "");
    for (const extracted of normalizedExtracted) {
      // Match if the extracted code starts with the required code (prefix match for code families)
      if (extracted.startsWith(normalizedRequired) || normalizedRequired.startsWith(extracted)) {
        return {
          matched: true,
          detail: `Diagnosis matched: ${extracted} matches required ${required}`
        };
      }
    }
  }

  return {
    matched: false,
    detail: `Required diagnosis not found. Need one of: ${criterion.icd10Codes.join(", ")}`
  };
}

function describeCriterion(criterion: PayerRuleCriterion): string {
  switch (criterion.type) {
    case "threshold":
      return `${criterion.measure} ${criterion.operator} ${criterion.value}${criterion.unit ? ` ${criterion.unit}` : ""}`;
    case "failed_treatment":
      return `Failed treatment: ${criterion.treatment}${criterion.durationWeeks !== undefined ? ` (>= ${criterion.durationWeeks} weeks)` : ""}`;
    case "comorbidity":
      return `One of these comorbidities: ${criterion.conditions.join(", ")}`;
    case "documentation_required":
      return criterion.description;
    case "diagnosis_required":
      return `One of these ICD-10 codes: ${criterion.icd10Codes.join(", ")}`;
    case "narrative":
      return criterion.text;
  }
}

function evaluateOperator(actual: number, operator: string, required: number): boolean {
  switch (operator) {
    case ">=":
      return actual >= required;
    case "<=":
      return actual <= required;
    case ">":
      return actual > required;
    case "<":
      return actual < required;
    case "==":
      return actual === required;
    default:
      return false;
  }
}

/** Extract meaningful terms from a string, filtering out common stop words. */
function extractKeyTerms(text: string): string[] {
  const stopWords = new Set([
    "a",
    "an",
    "the",
    "and",
    "or",
    "of",
    "in",
    "on",
    "at",
    "to",
    "for",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "has",
    "have",
    "had",
    "with",
    "as",
    "by",
    "from",
    "that",
    "this",
    "which",
    "who",
    "whom",
    "not",
    "no",
    "nor",
    "but",
    "if",
    "then",
    "than",
    "so",
    "up",
    "out",
    "its",
    "it",
    "they",
    "their",
    "all",
    "any",
    "each",
    "every",
    "both",
    "other",
    "such",
    "only",
    "own",
    "same",
    "more"
  ]);

  return text
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
}

/** Check whether two strings share meaningful medical terms. */
function termsOverlap(a: string, b: string): boolean {
  const aTerms = extractKeyTerms(a);
  const bTerms = new Set(extractKeyTerms(b));

  let overlap = 0;
  for (const term of aTerms) {
    if (bTerms.has(term)) {
      overlap++;
    }
  }

  // At least one meaningful term must overlap
  return overlap >= 1;
}

function countTermOverlap(aTerms: string[], bTerms: string[]): number {
  const bSet = new Set(bTerms);
  let count = 0;
  for (const term of aTerms) {
    if (bSet.has(term)) count++;
  }
  return count;
}
