import { z } from "zod";

const isoDatetimeSchema = z.string().datetime({ offset: true });
const simpleIdentifierSchema = z.string().min(1).max(128);
const codeSchema = z.string().trim().min(1).max(32);
const icd10CodeSchema = codeSchema.regex(/^[A-Z]\d{2}(?:\.\d{1,4}[A-Z]?)?$/i, "Invalid ICD-10-CM code format");

export const clinicalNoteSchema = z
  .object({
    id: simpleIdentifierSchema,
    text: z.string().min(1),
    authoredAt: isoDatetimeSchema.optional(),
    author: z.string().min(1).optional()
  })
  .strict();

export const problemSchema = z
  .object({
    code: icd10CodeSchema,
    description: z.string().min(1),
    status: z.string().min(1).optional()
  })
  .strict();

export const procedureSchema = z
  .object({
    code: codeSchema,
    description: z.string().min(1),
    performedAt: isoDatetimeSchema.optional()
  })
  .strict();

export const medicationSchema = z
  .object({
    code: codeSchema.optional(),
    name: z.string().min(1),
    dosage: z.string().min(1).optional(),
    status: z.string().min(1).optional()
  })
  .strict();

export const insuranceProviderSchema = z
  .object({
    name: z.string().min(1),
    payerType: z.string().min(1).optional(),
    planCategory: z.string().min(1).optional()
  })
  .strict();

export const assessmentPlanSchema = z
  .object({
    assessment: z.string().min(1).optional(),
    plan: z.string().min(1).optional()
  })
  .strict();

export const vitalSignSchema = z
  .object({
    type: z.string().min(1),
    value: z.number(),
    unit: z.string().min(1).optional(),
    recordedAt: isoDatetimeSchema.optional()
  })
  .strict();

export const cdaDocumentSchema = z
  .object({
    clinicalNotes: z.array(clinicalNoteSchema),
    problems: z.array(problemSchema),
    procedures: z.array(procedureSchema),
    medications: z.array(medicationSchema),
    insuranceProviders: z.array(insuranceProviderSchema),
    assessmentPlan: assessmentPlanSchema.nullable(),
    vitalSigns: z.array(vitalSignSchema),
    raw: z.record(z.string(), z.unknown())
  })
  .strict();

export const payerRuleCriterionSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("threshold"),
      measure: z.string().min(1),
      operator: z.enum([">=", "<=", ">", "<", "=="]),
      value: z.number(),
      unit: z.string().min(1).optional()
    })
    .strict(),
  z
    .object({
      type: z.literal("failed_treatment"),
      treatment: z.string().min(1),
      durationWeeks: z.number().int().positive().optional()
    })
    .strict(),
  z
    .object({
      type: z.literal("comorbidity"),
      conditions: z.array(z.string().min(1)).min(1)
    })
    .strict(),
  z
    .object({
      type: z.literal("documentation_required"),
      description: z.string().min(1)
    })
    .strict(),
  z
    .object({
      type: z.literal("diagnosis_required"),
      icd10Codes: z.array(codeSchema).min(1)
    })
    .strict(),
  z
    .object({
      type: z.literal("narrative"),
      text: z.string().min(1)
    })
    .strict()
]);

export const payerRuleSchema = z
  .object({
    sourceType: z.enum(["cms_lcd", "cms_ncd", "commercial_policy", "denial_pattern"]),
    sourceDocumentId: simpleIdentifierSchema,
    sourceDocumentVersion: z.number().int().positive(),
    sourceUrl: z.string().url(),
    cptCode: codeSchema,
    cptDescription: z.string().min(1).optional(),
    payer: z.string().min(1),
    payerPlanCategory: z.string().min(1).optional(),
    title: z.string().min(1),
    criteria: z.array(payerRuleCriterionSchema),
    effectiveDate: z.string().min(1),
    expirationDate: z.string().min(1).optional(),
    active: z.boolean(),
    lastSyncedAt: isoDatetimeSchema
  })
  .strict();

export const clinicalEvidenceItemSchema = z
  .object({
    type: z.enum([
      "failed_treatment",
      "threshold",
      "comorbidity",
      "symptom_duration",
      "functional_limitation",
      "other"
    ]),
    description: z.string().min(1).max(500),
    value: z.number().optional(),
    unit: z.string().min(1).max(32).optional(),
    durationWeeks: z.number().int().positive().optional()
  })
  .strict();

export const structuredCriteriaSchema = z
  .object({
    cptCode: codeSchema,
    icdCodes: z.array(codeSchema),
    clinicalEvidence: z.array(clinicalEvidenceItemSchema),
    payerType: z.string().min(1).max(120),
    payerPlanCategory: z.string().min(1).max(120).optional(),
    extractionConfidence: z.number().min(0).max(1),
    agentId: z.string().min(1).max(120),
    timestamp: isoDatetimeSchema
  })
  .strict();

export const missingCriteriaItemSchema = z
  .object({
    description: z.string().min(1),
    ruleType: z.string().min(1),
    severity: z.enum(["required", "supporting"])
  })
  .strict();

export const predictionResultSchema = z
  .object({
    verdict: z.enum(["approved", "denied", "needs-documentation"]),
    confidence: z.number().min(0).max(1),
    reasoning: z.array(z.string().min(1)).min(1),
    missingCriteria: z.array(missingCriteriaItemSchema)
  })
  .strict();

export const paRequirementSchema = z
  .object({
    cptCode: z.string(),
    payer: z.string(),
    requiresPriorAuth: z.boolean(),
    effectiveDate: z.string(),
    sourceUrl: z.string(),
    notes: z.string().optional()
  })
  .strict();

export const payerTransparencyMetricsSchema = z
  .object({
    payer: z.string(),
    reportingPeriod: z.string(),
    serviceCategory: z.string().optional(),
    totalRequests: z.number().int().optional(),
    approvalRate: z.number().min(0).max(1),
    denialRate: z.number().min(0).max(1),
    appealApprovalRate: z.number().min(0).max(1).optional(),
    avgTurnaroundDays: z.number().optional(),
    medianTurnaroundDays: z.number().optional(),
    sourceUrl: z.string(),
    lastUpdated: z.string()
  })
  .strict();

export type AssessmentPlan = z.infer<typeof assessmentPlanSchema>;
export type CdaDocument = z.infer<typeof cdaDocumentSchema>;
export type ClinicalEvidenceItem = z.infer<typeof clinicalEvidenceItemSchema>;
export type ClinicalNote = z.infer<typeof clinicalNoteSchema>;
export type InsuranceProvider = z.infer<typeof insuranceProviderSchema>;
export type Medication = z.infer<typeof medicationSchema>;
export type MissingCriteriaItem = z.infer<typeof missingCriteriaItemSchema>;
export type PaRequirement = z.infer<typeof paRequirementSchema>;
export type PayerRule = z.infer<typeof payerRuleSchema>;
export type PayerRuleCriterion = z.infer<typeof payerRuleCriterionSchema>;
export type PayerTransparencyMetrics = z.infer<typeof payerTransparencyMetricsSchema>;
export type PredictionResult = z.infer<typeof predictionResultSchema>;
export type Problem = z.infer<typeof problemSchema>;
export type Procedure = z.infer<typeof procedureSchema>;
export type StructuredCriteria = z.infer<typeof structuredCriteriaSchema>;
export type VitalSign = z.infer<typeof vitalSignSchema>;
