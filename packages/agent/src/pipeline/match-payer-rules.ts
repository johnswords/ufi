import type { PayerRule } from "@ufi/shared";

/**
 * Minimal interface for rule lookup. Decoupled from the full
 * PayerRulesRepository to keep the pipeline testable without PGlite.
 */
export interface RuleSource {
  listRules(): Promise<PayerRule[]>;
}

export async function matchPayerRules(cptCode: string, carrier: string, repository: RuleSource): Promise<PayerRule[]> {
  const allRules = await repository.listRules();
  const cptMatches = allRules.filter((r) => r.active && r.cptCode === cptCode);

  if (cptMatches.length === 0) {
    return [];
  }

  const carrierLower = carrier.toLowerCase();

  const carrierMatches = cptMatches.filter((r) => {
    const payerLower = r.payer.toLowerCase();
    return payerLower.includes(carrierLower) || carrierLower.includes(payerLower);
  });

  if (carrierMatches.length > 0) {
    return carrierMatches;
  }

  // Fall back to CMS Medicare rules when no carrier-specific rules found
  const cmsMatches = cptMatches.filter((r) => {
    const payerLower = r.payer.toLowerCase();
    return payerLower.includes("cms") || payerLower.includes("medicare");
  });

  return cmsMatches;
}
