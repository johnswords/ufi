/**
 * Hand-curated PA requirement data by CPT code and payer.
 *
 * Sources:
 *   - UnitedHealthcare prior authorization code lists (uhcprovider.com, 2025-2026)
 *   - Aetna precertification lists (aetna.com, updated March 2026)
 *   - Cigna/eviCore precertification code lists (CignaforHCP.com, 2025-2026)
 *   - CMS Medicare: DMEPOS PA required list, LCD/NCD coverage determinations
 *
 * Each record must pass `paRequirementSchema.parse()`.
 */

import type { PaRequirement } from "@ufi/shared";

// ---------------------------------------------------------------------------
// CPT codes that typically require PA across most commercial payers
// ---------------------------------------------------------------------------

const PAYERS = ["Aetna", "Cigna", "UnitedHealthcare", "Medicare"] as const;

interface CptPaProfile {
  cptCode: string;
  byPayer: Record<(typeof PAYERS)[number], { requires: boolean; notes?: string }>;
  sourceUrls: Record<(typeof PAYERS)[number], string>;
}

const CPT_PA_PROFILES: CptPaProfile[] = [
  // --- Total knee replacement ---
  {
    cptCode: "27447",
    byPayer: {
      Aetna: { requires: true, notes: "Precertification required per CPB 0660" },
      Cigna: { requires: true, notes: "eviCore CMM-311 review required" },
      UnitedHealthcare: { requires: true, notes: "InterQual delegated review" },
      Medicare: { requires: false, notes: "No PA required for traditional Medicare; some MA plans may require" }
    },
    sourceUrls: {
      Aetna: "https://www.aetna.com/cpb/medical/data/600_699/0660.html",
      Cigna: "https://www.evicore.com/resources/clinical-guidelines",
      UnitedHealthcare:
        "https://www.uhcprovider.com/content/dam/provider/docs/public/prior-auth/prior-authorization-requirements.pdf",
      Medicare: "https://www.cms.gov/medicare/coverage/coverage-general-information"
    }
  },
  // --- Partial knee replacement ---
  {
    cptCode: "27446",
    byPayer: {
      Aetna: { requires: true, notes: "Precertification required per CPB 0660" },
      Cigna: { requires: true, notes: "eviCore CMM-311 review required" },
      UnitedHealthcare: { requires: true, notes: "InterQual delegated review" },
      Medicare: { requires: false, notes: "No PA required for traditional Medicare" }
    },
    sourceUrls: {
      Aetna: "https://www.aetna.com/cpb/medical/data/600_699/0660.html",
      Cigna: "https://www.evicore.com/resources/clinical-guidelines",
      UnitedHealthcare:
        "https://www.uhcprovider.com/content/dam/provider/docs/public/prior-auth/prior-authorization-requirements.pdf",
      Medicare: "https://www.cms.gov/medicare/coverage/coverage-general-information"
    }
  },
  // --- Spinal fusion: posterior/posterolateral ---
  {
    cptCode: "22612",
    byPayer: {
      Aetna: { requires: true, notes: "Precertification required per CPB 0743" },
      Cigna: { requires: true, notes: "Lumbar fusion precertification form required" },
      UnitedHealthcare: { requires: true, notes: "InterQual delegated review" },
      Medicare: { requires: true, notes: "LCD coverage determination applies" }
    },
    sourceUrls: {
      Aetna: "https://www.aetna.com/cpb/medical/data/700_799/0743.html",
      Cigna:
        "https://static.cigna.com/assets/chcp/pdf/resourceLibrary/medical/cigna-healthcare-lumbar-fusion-precertification-fillable-form.pdf",
      UnitedHealthcare:
        "https://www.uhcprovider.com/content/dam/provider/docs/public/policies/comm-medical-drug/spinal-fusion-decompression.pdf",
      Medicare: "https://www.cms.gov/medicare/coverage/coverage-general-information"
    }
  },
  // --- Spinal fusion: posterior interbody ---
  {
    cptCode: "22630",
    byPayer: {
      Aetna: { requires: true, notes: "Precertification required per CPB 0743" },
      Cigna: { requires: true, notes: "Lumbar fusion precertification form required" },
      UnitedHealthcare: { requires: true, notes: "InterQual delegated review" },
      Medicare: { requires: true, notes: "LCD coverage determination applies" }
    },
    sourceUrls: {
      Aetna: "https://www.aetna.com/cpb/medical/data/700_799/0743.html",
      Cigna:
        "https://static.cigna.com/assets/chcp/pdf/resourceLibrary/medical/cigna-healthcare-lumbar-fusion-precertification-fillable-form.pdf",
      UnitedHealthcare:
        "https://www.uhcprovider.com/content/dam/provider/docs/public/policies/comm-medical-drug/spinal-fusion-decompression.pdf",
      Medicare: "https://www.cms.gov/medicare/coverage/coverage-general-information"
    }
  },
  // --- Spinal fusion: combined posterior + interbody ---
  {
    cptCode: "22633",
    byPayer: {
      Aetna: { requires: true, notes: "Precertification required per CPB 0743" },
      Cigna: { requires: true, notes: "Lumbar fusion precertification form required" },
      UnitedHealthcare: { requires: true, notes: "InterQual delegated review" },
      Medicare: { requires: true, notes: "LCD coverage determination applies" }
    },
    sourceUrls: {
      Aetna: "https://www.aetna.com/cpb/medical/data/700_799/0743.html",
      Cigna:
        "https://static.cigna.com/assets/chcp/pdf/resourceLibrary/medical/cigna-healthcare-lumbar-fusion-precertification-fillable-form.pdf",
      UnitedHealthcare:
        "https://www.uhcprovider.com/content/dam/provider/docs/public/policies/comm-medical-drug/spinal-fusion-decompression.pdf",
      Medicare: "https://www.cms.gov/medicare/coverage/coverage-general-information"
    }
  },
  // --- SCS: percutaneous electrode ---
  {
    cptCode: "63650",
    byPayer: {
      Aetna: { requires: true, notes: "Precertification required per CPB 0194" },
      Cigna: { requires: true, notes: "eviCore review required" },
      UnitedHealthcare: { requires: true, notes: "InterQual delegated review" },
      Medicare: { requires: true, notes: "LCD coverage determination applies" }
    },
    sourceUrls: {
      Aetna: "https://www.aetna.com/cpb/medical/data/100_199/0194.html",
      Cigna: "https://www.evicore.com/resources/clinical-guidelines",
      UnitedHealthcare:
        "https://www.uhcprovider.com/content/dam/provider/docs/public/policies/comm-medical-drug/implanted-electrical-stimulator-spinal-cord.pdf",
      Medicare: "https://www.cms.gov/medicare/coverage/coverage-general-information"
    }
  },
  // --- SCS: pulse generator ---
  {
    cptCode: "63685",
    byPayer: {
      Aetna: { requires: true, notes: "Precertification required per CPB 0194" },
      Cigna: { requires: true, notes: "eviCore review required" },
      UnitedHealthcare: { requires: true, notes: "InterQual delegated review" },
      Medicare: { requires: true, notes: "LCD coverage determination applies" }
    },
    sourceUrls: {
      Aetna: "https://www.aetna.com/cpb/medical/data/100_199/0194.html",
      Cigna: "https://www.evicore.com/resources/clinical-guidelines",
      UnitedHealthcare:
        "https://www.uhcprovider.com/content/dam/provider/docs/public/policies/comm-medical-drug/implanted-electrical-stimulator-spinal-cord.pdf",
      Medicare: "https://www.cms.gov/medicare/coverage/coverage-general-information"
    }
  },
  // --- Cervical disc arthroplasty ---
  {
    cptCode: "22856",
    byPayer: {
      Aetna: { requires: true, notes: "Precertification required per CPB 0591" },
      Cigna: { requires: true, notes: "eviCore review required" },
      UnitedHealthcare: { requires: true, notes: "InterQual delegated review" },
      Medicare: { requires: false, notes: "No PA required for traditional Medicare" }
    },
    sourceUrls: {
      Aetna: "https://www.aetna.com/cpb/medical/data/500_599/0591.html",
      Cigna: "https://www.evicore.com/resources/clinical-guidelines",
      UnitedHealthcare:
        "https://www.uhcprovider.com/content/dam/provider/docs/public/prior-auth/prior-authorization-requirements.pdf",
      Medicare: "https://www.cms.gov/medicare/coverage/coverage-general-information"
    }
  },
  // --- Knee arthroscopy / meniscectomy ---
  {
    cptCode: "29881",
    byPayer: {
      Aetna: { requires: true, notes: "Precertification required per CPB 0673" },
      Cigna: { requires: false, notes: "Diagnostic arthroscopy may not require PA; surgical may" },
      UnitedHealthcare: { requires: true, notes: "InterQual delegated review" },
      Medicare: { requires: false, notes: "No PA required for traditional Medicare" }
    },
    sourceUrls: {
      Aetna: "https://www.aetna.com/cpb/medical/data/600_699/0673.html",
      Cigna: "https://www.evicore.com/resources/clinical-guidelines",
      UnitedHealthcare:
        "https://www.uhcprovider.com/content/dam/provider/docs/public/policies/comm-medical-drug/surgery-knee.pdf",
      Medicare: "https://www.cms.gov/medicare/coverage/coverage-general-information"
    }
  },
  // --- Carpal tunnel release ---
  {
    cptCode: "64721",
    byPayer: {
      Aetna: { requires: false, notes: "NCS protocol applies (CPB 0502) but CTR itself generally does not require PA" },
      Cigna: { requires: false, notes: "Standard medical necessity; no formal eviCore CMM guideline" },
      UnitedHealthcare: { requires: false, notes: "Generally does not require prior authorization" },
      Medicare: { requires: false, notes: "No PA required for traditional Medicare" }
    },
    sourceUrls: {
      Aetna: "https://www.aetna.com/cpb/medical/data/500_599/0502.html",
      Cigna:
        "https://static.cigna.com/assets/chcp/pdf/coveragePolicies/medical/mm_0515_coveragepositioncriteria_musculoskeletal_procedures.pdf",
      UnitedHealthcare:
        "https://www.uhcprovider.com/content/dam/provider/docs/public/prior-auth/prior-authorization-requirements.pdf",
      Medicare: "https://www.cms.gov/medicare/coverage/coverage-general-information"
    }
  },
  // --- ACL reconstruction ---
  {
    cptCode: "29888",
    byPayer: {
      Aetna: { requires: true, notes: "Precertification required per CPB 0673" },
      Cigna: { requires: true, notes: "eviCore CMM-312 review required" },
      UnitedHealthcare: { requires: true, notes: "InterQual delegated review" },
      Medicare: { requires: false, notes: "No PA required for traditional Medicare" }
    },
    sourceUrls: {
      Aetna: "https://www.aetna.com/cpb/medical/data/600_699/0673.html",
      Cigna: "https://www.evicore.com/resources/clinical-guidelines",
      UnitedHealthcare:
        "https://www.uhcprovider.com/content/dam/provider/docs/public/policies/comm-medical-drug/surgery-knee.pdf",
      Medicare: "https://www.cms.gov/medicare/coverage/coverage-general-information"
    }
  },
  // --- Rotator cuff repair, open ---
  {
    cptCode: "23412",
    byPayer: {
      Aetna: { requires: true, notes: "Precertification required per CPB 0837" },
      Cigna: { requires: true, notes: "eviCore CMM-315 review required" },
      UnitedHealthcare: { requires: true, notes: "InterQual delegated review" },
      Medicare: { requires: false, notes: "No PA required for traditional Medicare" }
    },
    sourceUrls: {
      Aetna: "https://www.aetna.com/cpb/medical/data/800_899/0837.html",
      Cigna: "https://www.evicore.com/resources/clinical-guidelines",
      UnitedHealthcare:
        "https://www.uhcprovider.com/content/dam/provider/docs/public/prior-auth/prior-authorization-requirements.pdf",
      Medicare: "https://www.cms.gov/medicare/coverage/coverage-general-information"
    }
  },
  // --- Rotator cuff repair, arthroscopic ---
  {
    cptCode: "29827",
    byPayer: {
      Aetna: { requires: true, notes: "Precertification required per CPB 0837" },
      Cigna: { requires: true, notes: "eviCore CMM-315 review required" },
      UnitedHealthcare: { requires: true, notes: "InterQual delegated review" },
      Medicare: { requires: false, notes: "No PA required for traditional Medicare" }
    },
    sourceUrls: {
      Aetna: "https://www.aetna.com/cpb/medical/data/800_899/0837.html",
      Cigna: "https://www.evicore.com/resources/clinical-guidelines",
      UnitedHealthcare:
        "https://www.uhcprovider.com/content/dam/provider/docs/public/prior-auth/prior-authorization-requirements.pdf",
      Medicare: "https://www.cms.gov/medicare/coverage/coverage-general-information"
    }
  }
];

const EFFECTIVE_DATE = "2026-01-01";

function buildSeeds(): PaRequirement[] {
  const seeds: PaRequirement[] = [];
  for (const profile of CPT_PA_PROFILES) {
    for (const payer of PAYERS) {
      const config = profile.byPayer[payer];
      seeds.push({
        cptCode: profile.cptCode,
        payer,
        requiresPriorAuth: config.requires,
        effectiveDate: EFFECTIVE_DATE,
        sourceUrl: profile.sourceUrls[payer],
        notes: config.notes
      });
    }
  }
  return seeds;
}

export const paRequirementSeeds: PaRequirement[] = buildSeeds();
