import type { MissingCriteriaItem, PayerRule, StructuredCriteria } from "@ufi/shared";

import { predictOutcome } from "./predict-outcome.js";

/**
 * Identifies documentation gaps by running the prediction engine
 * and collecting all missing criteria across matched rules.
 *
 * This is a convenience wrapper: the same data is available
 * in `PredictionResult.missingCriteria`, but this function is
 * useful when callers need gaps without the full verdict.
 */
export function identifyGaps(criteria: StructuredCriteria, rules: PayerRule[]): MissingCriteriaItem[] {
  if (rules.length === 0) {
    return [];
  }

  const prediction = predictOutcome(criteria, rules);
  return prediction.missingCriteria;
}
