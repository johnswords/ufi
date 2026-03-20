/**
 * Stubbed prediction endpoint.
 *
 * The real implementation will look like:
 *
 *   import { extractCriteria } from "@ufi/agent";
 *   import { matchPayerRules, predictOutcome, identifyGaps } from "@ufi/agent";
 *
 *   const criteria = await extractCriteria(noteText, cptCode, { model });
 *   const rules = await matchPayerRules(cptCode, carrier, repository);
 *   const prediction = predictOutcome(criteria, rules);
 *   const gaps = identifyGaps(criteria, rules);
 *   return { ...prediction, missingCriteria: gaps };
 *
 * For now, return deterministic mock results keyed on the sample note IDs
 * (matched by CPT + carrier) so the demo feels realistic.
 */

import type { PredictionResult } from "@ufi/shared";

interface PredictInput {
  noteText: string;
  cptCode: string;
  carrier: string;
}

export function mockPredict(input: PredictInput): PredictionResult {
  const { noteText, cptCode, carrier } = input;

  // TKR + Medicare/any — well-documented approval case
  if (cptCode === "27447") {
    return {
      verdict: "approved",
      confidence: 0.87,
      reasoning: [
        "Patient meets radiographic criteria with Kellgren-Lawrence Grade III osteoarthritis and near-complete medial compartment joint space loss.",
        "Conservative treatment exhausted: 14 weeks formal in-person PT, hyaluronic acid injections, NSAIDs, and activity modification with documented plateau.",
        "Functional limitation clearly documented: ambulation limited to less than one block, difficulty with stairs and ADLs, requires cane for 6 months.",
        "VAS pain score 8/10 at rest exceeds typical threshold for surgical candidacy."
      ],
      missingCriteria: [
        {
          description:
            "BMI of 32.1 is documented but close to relative contraindication threshold (BMI >40 triggers extended conservative therapy requirement for some payers).",
          ruleType: "threshold",
          severity: "supporting"
        }
      ]
    };
  }

  // ACL + Cigna — acute injury approval
  if (cptCode === "29888" && carrier.toLowerCase().includes("cigna")) {
    return {
      verdict: "approved",
      confidence: 0.92,
      reasoning: [
        "MRI confirms complete ACL disruption at femoral attachment with characteristic bone bruise pattern.",
        "Physical exam demonstrates Grade 2 Lachman with soft endpoint, positive anterior drawer (8mm), and positive pivot shift — confirming functional instability.",
        "Patient reports knee giving way during ambulation, meeting subjective instability criterion.",
        "Acute injury exception applies: documented ACL tear with need to return to cutting/pivoting sports per CMM-312."
      ],
      missingCriteria: []
    };
  }

  // Rotator cuff + Aetna — needs more documentation
  if (cptCode === "29827" && carrier.toLowerCase().includes("aetna")) {
    return {
      verdict: "needs-documentation",
      confidence: 0.45,
      reasoning: [
        "MRI confirms Ellman Grade 2 partial-thickness supraspinatus tear — meets imaging criterion.",
        "Only 4 weeks of physical therapy completed. Aetna CPB 0837 requires minimum 12 weeks (3 months) of conservative therapy before surgical consideration.",
        "Physical exam documents positive Neer and Hawkins-Kennedy signs, but Jobe/Empty Can and Drop Arm tests were not performed — these are expected orthopedic tests for rotator cuff evaluation.",
        "Symptom duration of only 2 months is below the 6-month minimum required by Aetna CPB 0837."
      ],
      missingCriteria: [
        {
          description: "Insufficient conservative treatment duration: 4 weeks completed, 12 weeks required.",
          ruleType: "failed_treatment",
          severity: "required"
        },
        {
          description:
            "Symptom duration only 2 months — policy requires minimum 6 months of pain and functional disability.",
          ruleType: "threshold",
          severity: "required"
        },
        {
          description: "Jobe/Empty Can test and Drop Arm test not documented in physical exam.",
          ruleType: "documentation_required",
          severity: "required"
        },
        {
          description: "No corticosteroid injection attempted — typically expected as part of conservative management.",
          ruleType: "failed_treatment",
          severity: "supporting"
        }
      ]
    };
  }

  // Lumbar fusion + Cigna — denial
  if (cptCode === "22612" && carrier.toLowerCase().includes("cigna")) {
    return {
      verdict: "denied",
      confidence: 0.88,
      reasoning: [
        "Symptom duration is only 3 months. Cigna precertification requires minimum 12 months of unremitting symptoms for lumbar fusion.",
        "Only 6 weeks of structured conservative management documented. Cigna requires 6 months (26 weeks) including PT, exercise/core stabilization, NSAIDs, and activity modification.",
        "No CBT or behavioral health referral completed. Cigna requires 3+ individual or group CBT sessions by a licensed professional.",
        "Patient is an active smoker (1 PPD x 25 years). Cigna requires patient to be a nonsmoker or refrain from tobacco for at least 6 weeks prior to surgery.",
        "No mental health attestation on file as required by Cigna precertification form."
      ],
      missingCriteria: [
        {
          description: "Symptom duration 3 months — requires minimum 12 months.",
          ruleType: "threshold",
          severity: "required"
        },
        {
          description: "Conservative treatment duration 6 weeks — requires minimum 26 weeks structured management.",
          ruleType: "failed_treatment",
          severity: "required"
        },
        {
          description: "No CBT or behavioral health treatment documented — 3+ sessions required.",
          ruleType: "failed_treatment",
          severity: "required"
        },
        {
          description: "Active smoker — must be nonsmoker or abstain from tobacco 6+ weeks pre-surgery.",
          ruleType: "documentation_required",
          severity: "required"
        },
        {
          description:
            "Missing mental health attestation from PCP, neurologist, physiatrist, psychiatrist, psychologist, or licensed behavioral health provider.",
          ruleType: "documentation_required",
          severity: "required"
        }
      ]
    };
  }

  // Carpal tunnel + UHC — approval
  if (cptCode === "64721") {
    return {
      verdict: "approved",
      confidence: 0.94,
      reasoning: [
        "NCS/EMG confirms severe right carpal tunnel syndrome with axonal loss: median motor distal latency 5.8ms (normal <4.2), reduced SNAP amplitude, fibrillation potentials in APB.",
        "Conservative treatment exhausted over 8+ weeks: bilateral wrist splints x 8 weeks, NSAIDs x 6 weeks, corticosteroid injection with only temporary relief.",
        "Clinical thenar atrophy with measurable grip strength deficit (18kg vs 26kg contralateral) — indicates nerve damage progression requiring prompt intervention.",
        "Physical exam positive for Phalen's test (15 seconds), Tinel's sign, and decreased two-point discrimination in median nerve distribution."
      ],
      missingCriteria: []
    };
  }

  // Generic fallback for any other CPT/carrier combination
  return buildGenericResult(noteText, cptCode, carrier);
}

function buildGenericResult(noteText: string, cptCode: string, carrier: string): PredictionResult {
  const wordCount = noteText.split(/\s+/).length;
  const hasImaging = /\b(MRI|CT|x-ray|radiograph|imaging)\b/i.test(noteText);
  const hasPT = /\b(physical therapy|PT|rehabilitation)\b/i.test(noteText);
  const hasExam = /\b(physical exam|examination)\b/i.test(noteText);

  const missing: PredictionResult["missingCriteria"] = [];

  if (!hasImaging) {
    missing.push({
      description: "No imaging studies referenced in the note.",
      ruleType: "documentation_required",
      severity: "required"
    });
  }
  if (!hasPT) {
    missing.push({
      description: "No physical therapy or conservative treatment documented.",
      ruleType: "failed_treatment",
      severity: "required"
    });
  }
  if (!hasExam) {
    missing.push({
      description: "No physical examination findings documented.",
      ruleType: "documentation_required",
      severity: "required"
    });
  }

  if (missing.length === 0) {
    return {
      verdict: "approved",
      confidence: 0.65,
      reasoning: [
        `Note contains documentation of imaging, physical therapy, and examination findings for CPT ${cptCode} with ${carrier}.`,
        "Stubbed prediction — real pipeline will provide detailed criteria matching."
      ],
      missingCriteria: []
    };
  }

  return {
    verdict: missing.some((m) => m.severity === "required") ? "needs-documentation" : "approved",
    confidence: Math.max(0.3, 0.8 - missing.length * 0.15),
    reasoning: [
      `Preliminary analysis of ${wordCount}-word note for CPT ${cptCode} with ${carrier}.`,
      "Stubbed prediction — real pipeline will provide detailed criteria matching.",
      `Found ${missing.length} documentation gap(s) that may affect authorization.`
    ],
    missingCriteria: missing
  };
}
