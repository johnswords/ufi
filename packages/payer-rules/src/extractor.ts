import type { PayerRuleCriterion } from "@ufi/shared";

import { htmlToSegments, normalizeNarrativeText } from "./text.js";

export interface InferredProcedureCode {
  readonly cptCode: string;
  readonly cptDescription: string;
}

const knownComorbidities = [
  "type ii diabetes mellitus",
  "type 2 diabetes mellitus",
  "diabetes",
  "hypertension",
  "resistant hypertension",
  "refractory hyperlipidemia",
  "obesity-induced cardiomyopathy",
  "obstructive sleep apnea",
  "sleep apnea",
  "obesity hypoventilation syndrome",
  "pickwickian syndrome",
  "nonalcoholic steatohepatitis",
  "nonalcoholic fatty liver disease",
  "degenerative arthritis",
  "pulmonary/respiratory disease",
  "pulmonary disease",
  "respiratory disease",
  "gastroesophageal reflux disease",
  "gerd"
];

const boilerplateFragments = [
  "internet only manual",
  "social security act",
  "this lcd supplements",
  "implementation dates",
  "covered indications",
  "nationally covered indications",
  "nationally non-covered indications",
  "documentation requirements"
];

const inferredProcedureCodeMappings: Array<{ pattern: RegExp; codes: InferredProcedureCode[] }> = [
  {
    pattern: /roux-en-y gastric bypass|rygbp/iu,
    codes: [
      {
        cptCode: "43644",
        cptDescription:
          "Laparoscopy, surgical, gastric restrictive procedure; with gastric bypass and Roux-en-Y gastroenterostomy"
      },
      {
        cptCode: "43645",
        cptDescription:
          "Laparoscopy, surgical, gastric restrictive procedure; with gastric bypass and small intestine reconstruction"
      },
      {
        cptCode: "43846",
        cptDescription:
          "Gastric restrictive procedure, with gastric bypass for morbid obesity; with short limb Roux-en-Y gastroenterostomy"
      },
      {
        cptCode: "43847",
        cptDescription:
          "Gastric restrictive procedure, with gastric bypass for morbid obesity; with small intestine reconstruction"
      }
    ]
  },
  {
    pattern: /adjustable gastric banding|lagb|agb/iu,
    codes: [
      {
        cptCode: "43770",
        cptDescription:
          "Laparoscopy, surgical, gastric restrictive procedure; placement of adjustable gastric restrictive device"
      }
    ]
  },
  {
    pattern: /sleeve gastrectomy|lsg/iu,
    codes: [
      {
        cptCode: "43775",
        cptDescription:
          "Laparoscopy, surgical, gastric restrictive procedure; longitudinal gastrectomy (sleeve gastrectomy)"
      }
    ]
  },
  {
    pattern: /biliopancreatic diversion with duodenal switch|bpd\/ds|bpd\/grds|duodenal switch/iu,
    codes: [
      {
        cptCode: "43845",
        cptDescription:
          "Gastric restrictive procedure with partial gastrectomy, pylorus-preserving duodenoileostomy and ileoileostomy"
      }
    ]
  }
];

function pushUnique(target: PayerRuleCriterion[], seen: Set<string>, criterion: PayerRuleCriterion): void {
  const key = JSON.stringify(criterion);
  if (!seen.has(key)) {
    seen.add(key);
    target.push(criterion);
  }
}

function normalizeOperator(operator: string): ">=" | "<=" | ">" | "<" | "==" {
  const normalized = operator.trim().toLowerCase();
  if (
    normalized === ">=" ||
    normalized === "=>" ||
    normalized === "at least" ||
    normalized === "greater than or equal to"
  ) {
    return ">=";
  }

  if (
    normalized === "<=" ||
    normalized === "=<" ||
    normalized === "at most" ||
    normalized === "less than or equal to"
  ) {
    return "<=";
  }

  if (normalized === ">" || normalized === "greater than") {
    return ">";
  }

  if (normalized === "<" || normalized === "less than") {
    return "<";
  }

  return "==";
}

function extractThresholds(segment: string): PayerRuleCriterion[] {
  const criteria: PayerRuleCriterion[] = [];
  const thresholdPattern =
    /\b(BMI|body[- ]mass index|body mass index|blood pressure|HbA1c|A1c)\b(?:\s*\([^)]+\))?[^0-9<>=(]{0,80}(>=|<=|>|<|=|at least|at most|greater than or equal to|less than or equal to|greater than|less than)\s*(\d+(?:\.\d+)?)\s*([a-z%/0-9.-]+)?/giu;

  for (const match of segment.matchAll(thresholdPattern)) {
    const measure = match[1]?.replace(/\s+/g, " ");
    const operator = match[2];
    const rawValue = match[3];
    if (!measure || !operator || !rawValue) {
      continue;
    }

    criteria.push({
      type: "threshold",
      measure,
      operator: normalizeOperator(operator),
      value: Number(rawValue),
      ...(match[4] ? { unit: match[4] } : {})
    });
  }

  return criteria;
}

function extractFailedTreatment(segment: string): PayerRuleCriterion[] {
  const normalized = segment.toLowerCase();
  const criteria: PayerRuleCriterion[] = [];
  const durationMatch = normalized.match(/(\d+)\s+weeks?/u);
  const durationWeeks = durationMatch ? Number(durationMatch[1]) : undefined;

  if (normalized.includes("unsuccessful with medical treatment for obesity")) {
    criteria.push({
      type: "failed_treatment",
      treatment: "medical treatment for obesity",
      ...(durationWeeks ? { durationWeeks } : {})
    });
  }

  if (normalized.includes("structured dietary program")) {
    criteria.push({
      type: "failed_treatment",
      treatment: "structured dietary program",
      ...(durationWeeks ? { durationWeeks } : {})
    });
  }

  if (normalized.includes("physical therapy")) {
    criteria.push({
      type: "failed_treatment",
      treatment: "physical therapy",
      ...(durationWeeks ? { durationWeeks } : {})
    });
  }

  return criteria;
}

function extractComorbidities(segment: string): PayerRuleCriterion[] {
  const normalized = segment.toLowerCase();
  const conditions = knownComorbidities.filter((condition) => normalized.includes(condition));

  if (conditions.length === 0 && !normalized.includes("co-morbid") && !normalized.includes("comorbid")) {
    return [];
  }

  return [
    {
      type: "comorbidity",
      conditions: conditions.length > 0 ? conditions : ["obesity-related comorbidity"]
    }
  ];
}

function extractDocumentationRequirements(segment: string): PayerRuleCriterion[] {
  const normalized = segment.toLowerCase();
  const signals = [
    "documentation",
    "medical record must include",
    "must include",
    "must substantiate",
    "must undergo",
    "psychological evaluation",
    "evaluation and assessment"
  ];

  if (!signals.some((signal) => normalized.includes(signal))) {
    return [];
  }

  return [
    {
      type: "documentation_required",
      description: normalizeNarrativeText(segment)
    }
  ];
}

const icd10Pattern = /\b([A-Z]\d{2}(?:\.\d{1,4}[A-Z]?)?)\b/g;

export function extractDiagnosisRequirements(segment: string): PayerRuleCriterion[] {
  const codes = new Set<string>();

  for (const match of segment.matchAll(icd10Pattern)) {
    if (match[1]) {
      codes.add(match[1]);
    }
  }

  if (codes.size === 0) {
    return [];
  }

  return [
    {
      type: "diagnosis_required",
      icd10Codes: [...codes].sort()
    }
  ];
}

function shouldKeepAsNarrative(segment: string): boolean {
  if (segment.length < 30) {
    return false;
  }

  const normalized = segment.toLowerCase();
  return !boilerplateFragments.some((fragment) => normalized.includes(fragment));
}

export function extractCriteriaFromNarrative(...htmlBlocks: Array<string | undefined>): PayerRuleCriterion[] {
  const criteria: PayerRuleCriterion[] = [];
  const seen = new Set<string>();

  for (const block of htmlBlocks) {
    if (!block) {
      continue;
    }

    for (const segment of htmlToSegments(block)) {
      const extracted = [
        ...extractThresholds(segment),
        ...extractFailedTreatment(segment),
        ...extractComorbidities(segment),
        ...extractDocumentationRequirements(segment),
        ...extractDiagnosisRequirements(segment)
      ];

      if (extracted.length > 0) {
        for (const criterion of extracted) {
          pushUnique(criteria, seen, criterion);
        }
        continue;
      }

      if (shouldKeepAsNarrative(segment)) {
        pushUnique(criteria, seen, {
          type: "narrative",
          text: normalizeNarrativeText(segment)
        });
      }
    }
  }

  return criteria;
}

export function extractCriteriaFromCmsTexts(texts: string[]): PayerRuleCriterion[] {
  return extractCriteriaFromNarrative(...texts);
}

export function inferProcedureCodesFromCmsTexts(texts: string[]): InferredProcedureCode[] {
  const text = texts
    .flatMap((segment) => htmlToSegments(segment))
    .map(normalizeNarrativeText)
    .join("\n");
  const codes: InferredProcedureCode[] = [];
  const seen = new Set<string>();

  for (const mapping of inferredProcedureCodeMappings) {
    if (!mapping.pattern.test(text)) {
      continue;
    }

    for (const code of mapping.codes) {
      if (seen.has(code.cptCode)) {
        continue;
      }

      seen.add(code.cptCode);
      codes.push(code);
    }
  }

  return codes;
}
