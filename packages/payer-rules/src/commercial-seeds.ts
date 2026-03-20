/**
 * Hand-curated commercial payer rules derived from published clinical guidelines.
 *
 * Sources:
 *   - Cigna/eviCore CMM-311, CMM-312, CMM-315, Lumbar Fusion Precert Form
 *   - UnitedHealthcare policies 2026T0553HH, 2026T0639H, 2026T0567DD
 *   - Aetna CPBs 0660, 0673, 0837, 0743, 0502, 0194, 0591
 *
 * These are version-controlled reference data — update manually when payer
 * policies change. Each record must pass `payerRuleSchema.parse()`.
 */

import type { PayerRule } from "@ufi/shared";

const NOW = new Date().toISOString();

// ---------------------------------------------------------------------------
// Cigna / eviCore
// ---------------------------------------------------------------------------

const CIGNA_CMM311_TKR: PayerRule = {
  sourceType: "commercial_policy",
  sourceDocumentId: "CMM-311-TKR",
  sourceDocumentVersion: 2,
  sourceUrl:
    "https://www.evicore.com/sites/default/files/clinical-guidelines/2025-11/Cigna_CMM-311%20Knee%20Replacement%20Arthroplasty_V2.0.2025_Eff03.07.2026_Pub11.21.2025.pdf",
  cptCode: "27447",
  cptDescription:
    "Arthroplasty, knee, condyle and plateau; medial AND lateral compartments with or without patella resurfacing (total knee arthroplasty)",
  payer: "Cigna",
  payerPlanCategory: "eviCore MSK",
  title: "Total Knee Replacement — OA/AVN Criteria (CMM-311)",
  effectiveDate: "2026-03-07",
  active: true,
  lastSyncedAt: NOW,
  criteria: [
    {
      type: "threshold",
      measure: "Kellgren-Lawrence grade",
      operator: ">=",
      value: 3,
      unit: "grade"
    },
    {
      type: "threshold",
      measure: "Function-limiting pain duration",
      operator: ">=",
      value: 3,
      unit: "months"
    },
    {
      type: "failed_treatment",
      treatment:
        "Provider-directed non-surgical management (rest, weight loss, PT, medications, assistive devices, injections)",
      durationWeeks: 12
    },
    {
      type: "documentation_required",
      description:
        "Imaging or arthroscopy showing severe OA (KL Grade III/IV, Outerbridge Grade IV, or modified Outerbridge Grade IV on MRI) OR avascular necrosis of femoral condyles/proximal tibia"
    },
    {
      type: "documentation_required",
      description: "Loss of knee function interfering with age-appropriate ADLs and/or demands of employment"
    },
    {
      type: "narrative",
      text: "Exception: Non-surgical management may be inappropriate if medical record clearly documents why. Surgeon must preoperatively optimize reasonably modifiable medical and behavioral health comorbidities. Non-indications include: joint instability not correctable, >30° fixed varus/valgus, dialysis, active infection, vascular insufficiency (ABI <0.5)."
    }
  ]
};

const CIGNA_CMM311_PKR: PayerRule = {
  sourceType: "commercial_policy",
  sourceDocumentId: "CMM-311-PKR",
  sourceDocumentVersion: 2,
  sourceUrl:
    "https://www.evicore.com/sites/default/files/clinical-guidelines/2025-11/Cigna_CMM-311%20Knee%20Replacement%20Arthroplasty_V2.0.2025_Eff03.07.2026_Pub11.21.2025.pdf",
  cptCode: "27446",
  cptDescription: "Arthroplasty, knee, condyle and plateau; medial OR lateral compartment (partial knee)",
  payer: "Cigna",
  payerPlanCategory: "eviCore MSK",
  title: "Partial Knee Replacement — OA/AVN Criteria (CMM-311)",
  effectiveDate: "2026-03-07",
  active: true,
  lastSyncedAt: NOW,
  criteria: [
    {
      type: "threshold",
      measure: "Kellgren-Lawrence grade",
      operator: ">=",
      value: 4,
      unit: "grade"
    },
    {
      type: "threshold",
      measure: "Knee arc of motion",
      operator: ">",
      value: 90,
      unit: "degrees"
    },
    {
      type: "threshold",
      measure: "Function-limiting pain duration",
      operator: ">=",
      value: 3,
      unit: "months"
    },
    {
      type: "failed_treatment",
      treatment:
        "Provider-directed non-surgical management (rest, weight loss, PT, medications, assistive devices, injections)",
      durationWeeks: 12
    },
    {
      type: "documentation_required",
      description:
        "Imaging showing severe unicompartmental OA (KL Grade IV, Outerbridge Grade IV, or modified Outerbridge Grade IV on MRI) OR unicompartmental AVN of femoral condyles/proximal tibia"
    },
    {
      type: "documentation_required",
      description: "Physical exam demonstrating knee stability AND knee arc of motion >90 degrees"
    },
    {
      type: "documentation_required",
      description: "Loss of knee function interfering with age-appropriate ADLs and/or demands of employment"
    },
    {
      type: "narrative",
      text: "Non-indications: Grade IV patellofemoral OA (for medial/lateral uni), Grade III/IV medial/lateral OA (for patellofemoral), patellar malalignment (Q angle >15° M / >20° F), tibial/femoral shaft deformity, medial/lateral subluxation, flexion contracture >15°, valgus >20°, varus >15°, varus >=10° with sagittal subluxation >=6mm (ACL deficient), Charcot joint, inflammatory arthropathy, active infection, vascular insufficiency (ABI <0.5)."
    }
  ]
};

const CIGNA_CMM312_ACL: PayerRule = {
  sourceType: "commercial_policy",
  sourceDocumentId: "CMM-312",
  sourceDocumentVersion: 1,
  sourceUrl:
    "https://www.evicore.com/sites/default/files/clinical-guidelines/2024-12/eviCore_CMM-312%20Knee%20Surg%20Arthro_Final_V1.0.2024_eff08.01.2024_pub09.17.24_upd12.10.24.pdf",
  cptCode: "29888",
  cptDescription: "Arthroscopically aided anterior cruciate ligament repair/augmentation or reconstruction",
  payer: "Cigna",
  payerPlanCategory: "eviCore MSK",
  title: "ACL Reconstruction (CMM-312)",
  effectiveDate: "2024-08-01",
  active: true,
  lastSyncedAt: NOW,
  criteria: [
    {
      type: "documentation_required",
      description: "MRI, CT arthrogram, or arthroscopy showing ACL tear/disruption or significant laxity"
    },
    {
      type: "documentation_required",
      description: "Positive physical exam: Lachman's test, anterior drawer test, or pivot shift test"
    },
    {
      type: "documentation_required",
      description:
        "Function-limiting knee pain/loss of function interfering with ADLs, employment, or activities requiring cutting/pivoting/agility"
    },
    {
      type: "documentation_required",
      description: "Patient reports knee instability (giving way, subjective weakness, or buckling)"
    },
    {
      type: "failed_treatment",
      treatment: "Provider-directed non-surgical management",
      durationWeeks: 12
    },
    {
      type: "narrative",
      text: "Acute injury exception: 3 months non-surgical management NOT required when joint instability is documented AND any of: (1) need to return to cutting/pivoting activities, (2) confirmed ACL tear with repairable meniscus tear, (3) concomitant multi-ligamentous injury requiring reconstruction. ACL repair (as distinct from reconstruction) is experimental/investigational/unproven."
    }
  ]
};

const CIGNA_CMM315_RCR_OPEN: PayerRule = {
  sourceType: "commercial_policy",
  sourceDocumentId: "CMM-315-open",
  sourceDocumentVersion: 2,
  sourceUrl:
    "https://www.evicore.com/sites/default/files/clinical-guidelines/2025-11/Cigna_CMM-315%20Shoulder%20Surg%20Arthro%20Open%20Proc_V2.0.2025_Eff03.07.2026_Pub11.21.2025.pdf",
  cptCode: "23412",
  cptDescription: "Repair of ruptured musculotendinous cuff (eg, rotator cuff) open; chronic",
  payer: "Cigna",
  payerPlanCategory: "eviCore MSK",
  title: "Rotator Cuff Repair — Open (CMM-315)",
  effectiveDate: "2026-03-07",
  active: true,
  lastSyncedAt: NOW,
  criteria: [
    {
      type: "documentation_required",
      description: "MRI or CT showing Grade 2/3 partial-thickness tear (Ellman) or full-thickness tear (Cofield)"
    },
    {
      type: "documentation_required",
      description:
        "Physical exam: functionally-limited ROM or measurable strength loss PLUS positive orthopedic test (Drop Arm, Painful Arc, Jobe/Empty Can, External/Internal Rotation Lag, Lift-Off, Bear Hug, Belly Press, Belly-Off, Neer, Hawkins-Kennedy, or Hornblower)"
    },
    {
      type: "documentation_required",
      description: "Function-limiting pain interfering with age-appropriate ADLs and/or demands of employment"
    },
    {
      type: "failed_treatment",
      treatment: "Provider-directed non-surgical management",
      durationWeeks: 12
    },
    {
      type: "documentation_required",
      description:
        "Other pathology excluded: fracture, thoracic outlet syndrome, brachial plexus disorders, referred neck pain, cervical radiculopathy, advanced glenohumeral OA"
    },
    {
      type: "narrative",
      text: "Acute exception: 3 months non-surgical management NOT required for discrete traumatic event causing acute full-thickness tear WITHOUT evidence of pre-existing chronic tear. Fatty infiltration and/or muscle atrophy on MRI/CT IS evidence of pre-existing chronic tear — non-surgical management is then required. Superior capsular reconstruction is experimental/investigational/unproven."
    }
  ]
};

const CIGNA_CMM315_RCR_ARTHRO: PayerRule = {
  ...CIGNA_CMM315_RCR_OPEN,
  sourceDocumentId: "CMM-315-arthro",
  cptCode: "29827",
  cptDescription: "Arthroscopy, shoulder, surgical; with rotator cuff repair",
  title: "Rotator Cuff Repair — Arthroscopic (CMM-315)"
};

const CIGNA_LUMBAR_FUSION_22612: PayerRule = {
  sourceType: "commercial_policy",
  sourceDocumentId: "CIGNA-LF-precert",
  sourceDocumentVersion: 1,
  sourceUrl:
    "https://static.cigna.com/assets/chcp/pdf/resourceLibrary/medical/cigna-healthcare-lumbar-fusion-precertification-fillable-form.pdf",
  cptCode: "22612",
  cptDescription: "Arthrodesis, posterior or posterolateral technique; lumbar",
  payer: "Cigna",
  payerPlanCategory: "Commercial",
  title: "Lumbar Spinal Fusion Precertification — Single Level DDD",
  effectiveDate: "2026-01-01",
  active: true,
  lastSyncedAt: NOW,
  criteria: [
    {
      type: "threshold",
      measure: "Symptom duration (unremitting pain + functional impairment)",
      operator: ">=",
      value: 12,
      unit: "months"
    },
    {
      type: "failed_treatment",
      treatment:
        "Structured physician-supervised conservative management: exercise/core stabilization, NSAIDs/steroids, PT (passive + active), activity/lifestyle modification",
      durationWeeks: 26
    },
    {
      type: "failed_treatment",
      treatment:
        "3+ individual or group CBT sessions (disease education, activity/lifestyle modification, stress management) by licensed professional",
      durationWeeks: 26
    },
    {
      type: "documentation_required",
      description: "Single level DDD demonstrated on CT, MRI, or discography as likely cause of pain"
    },
    {
      type: "documentation_required",
      description:
        "Attestation from PCP, neurologist, physiatrist, psychiatrist, psychologist, or licensed behavioral health provider: absence of untreated underlying mental health conditions (depression, substance abuse) as major contributor to chronic pain"
    },
    {
      type: "documentation_required",
      description:
        "Patient is nonsmoker, or will refrain from tobacco for >=6 weeks prior to surgery (in absence of progressive neurological compromise)"
    },
    {
      type: "documentation_required",
      description:
        "Clinical documentation: onset of symptoms, pain location/distribution, myelopathy/radiculopathy symptoms, functional limitations, physical exam findings (sensory, motor, reflex, Babinski, Romberg), diagnostic imaging reports"
    }
  ]
};

function makeLumbarFusionVariant(cptCode: string, cptDescription: string, docIdSuffix: string): PayerRule {
  return {
    ...CIGNA_LUMBAR_FUSION_22612,
    sourceDocumentId: `CIGNA-LF-precert-${docIdSuffix}`,
    cptCode,
    cptDescription
  };
}

const CIGNA_LUMBAR_FUSION_22630 = makeLumbarFusionVariant(
  "22630",
  "Arthrodesis, posterior interbody technique, including laminectomy and/or discectomy; single interspace, lumbar",
  "22630"
);

const CIGNA_LUMBAR_FUSION_22633 = makeLumbarFusionVariant(
  "22633",
  "Arthrodesis, combined posterior or posterolateral technique with posterior interbody technique; single interspace, lumbar",
  "22633"
);

const CIGNA_CARPAL_TUNNEL: PayerRule = {
  sourceType: "commercial_policy",
  sourceDocumentId: "CIGNA-CTR",
  sourceDocumentVersion: 1,
  sourceUrl:
    "https://static.cigna.com/assets/chcp/pdf/coveragePolicies/medical/mm_0515_coveragepositioncriteria_musculoskeletal_procedures.pdf",
  cptCode: "64721",
  cptDescription: "Neuroplasty and/or transposition; median nerve at carpal tunnel",
  payer: "Cigna",
  payerPlanCategory: "Commercial",
  title: "Carpal Tunnel Release — General Medical Necessity",
  effectiveDate: "2026-01-01",
  active: true,
  lastSyncedAt: NOW,
  criteria: [
    {
      type: "documentation_required",
      description: "Nerve conduction studies (NCS) and/or EMG confirming median nerve compression at the carpal tunnel"
    },
    {
      type: "failed_treatment",
      treatment: "Conservative management: splinting, NSAIDs, activity modification, and/or corticosteroid injections",
      durationWeeks: 6
    },
    {
      type: "documentation_required",
      description: "Functional limitations documented in medical record"
    },
    {
      type: "documentation_required",
      description:
        "Physical exam findings consistent with CTS: positive Phalen's test, positive Tinel's sign, decreased grip strength, and/or thenar atrophy"
    },
    {
      type: "narrative",
      text: "No formal eviCore CMM guideline exists for carpal tunnel release. Standard medical necessity documentation applies. Surgery may be considered when: symptoms persist after extended conservative treatment, severe symptoms (persistent loss of feeling/coordination, no thumb strength), nerve damage confirmed on NCS/EMG, or ongoing symptoms despite conservative management."
    }
  ]
};

// ---------------------------------------------------------------------------
// UnitedHealthcare
// ---------------------------------------------------------------------------

const UHC_KNEE_TKR: PayerRule = {
  sourceType: "commercial_policy",
  sourceDocumentId: "2026T0553HH-TKR",
  sourceDocumentVersion: 1,
  sourceUrl: "https://www.uhcprovider.com/content/dam/provider/docs/public/policies/comm-medical-drug/surgery-knee.pdf",
  cptCode: "27447",
  cptDescription: "Arthroplasty, knee, condyle and plateau; medial AND lateral compartments (total knee arthroplasty)",
  payer: "UnitedHealthcare",
  payerPlanCategory: "Commercial",
  title: "Total Joint Replacement (TJR), Knee — UHC (InterQual delegated)",
  effectiveDate: "2026-03-01",
  active: true,
  lastSyncedAt: NOW,
  criteria: [
    {
      type: "threshold",
      measure: "WOMAC pain domain",
      operator: ">",
      value: 40
    },
    {
      type: "threshold",
      measure: "WOMAC functional limitation domain",
      operator: ">",
      value: 40
    },
    {
      type: "documentation_required",
      description:
        "Radiographic findings of OA: 3+ moderate-to-severe findings from narrowing of joint space, osteophyte formation, subchondral sclerosis, subchondral cysts, deformity of bony end-plates, thinning/complete loss of articular cartilage"
    },
    {
      type: "narrative",
      text: "Detailed clinical criteria delegated to InterQual CP: Procedures (Change Healthcare). Providers must access InterQual directly for point-of-care criteria. Non-covered articular cartilage repair includes: autologous/allogeneic minced cartilage, collagen meniscus implant, decellularized osteochondral allografts, reduced osteochondral discs, synthetic resorbable polymers, xenograft implantation."
    }
  ]
};

const UHC_KNEE_PKR: PayerRule = {
  sourceType: "commercial_policy",
  sourceDocumentId: "2026T0553HH-PKR",
  sourceDocumentVersion: 1,
  sourceUrl: "https://www.uhcprovider.com/content/dam/provider/docs/public/policies/comm-medical-drug/surgery-knee.pdf",
  cptCode: "27446",
  cptDescription: "Arthroplasty, knee, condyle and plateau; medial OR lateral compartment (partial knee)",
  payer: "UnitedHealthcare",
  payerPlanCategory: "Commercial",
  title: "Unicondylar or Patellofemoral Knee Replacement — UHC (InterQual delegated)",
  effectiveDate: "2026-03-01",
  active: true,
  lastSyncedAt: NOW,
  criteria: [
    {
      type: "threshold",
      measure: "WOMAC pain domain",
      operator: ">",
      value: 40
    },
    {
      type: "threshold",
      measure: "WOMAC functional limitation domain",
      operator: ">",
      value: 40
    },
    {
      type: "documentation_required",
      description:
        "Outerbridge grading of articular cartilage damage (Grade III: fissuring to subchondral bone >1.5cm; Grade IV: exposed subchondral bone)"
    },
    {
      type: "narrative",
      text: "Detailed clinical criteria delegated to InterQual CP: Procedures. Providers must access InterQual directly for point-of-care criteria."
    }
  ]
};

const UHC_KNEE_MENISCECTOMY: PayerRule = {
  sourceType: "commercial_policy",
  sourceDocumentId: "2026T0553HH-MENI",
  sourceDocumentVersion: 1,
  sourceUrl: "https://www.uhcprovider.com/content/dam/provider/docs/public/policies/comm-medical-drug/surgery-knee.pdf",
  cptCode: "29881",
  cptDescription: "Arthroscopy, knee; meniscectomy (medial OR lateral)",
  payer: "UnitedHealthcare",
  payerPlanCategory: "Commercial",
  title: "Knee Arthroscopy — Meniscectomy — UHC (InterQual delegated)",
  effectiveDate: "2026-03-01",
  active: true,
  lastSyncedAt: NOW,
  criteria: [
    {
      type: "documentation_required",
      description:
        "Clinical criteria per InterQual CP: Procedures — Arthroscopy or Arthroscopically Assisted Surgery, Knee"
    },
    {
      type: "narrative",
      text: "UHC delegates detailed criteria to InterQual (Change Healthcare). Policy covers diagnostic arthroscopy, meniscectomy, meniscus repair, chondroplasty, and microfracture when InterQual criteria are met."
    }
  ]
};

const UHC_KNEE_ACL: PayerRule = {
  sourceType: "commercial_policy",
  sourceDocumentId: "2026T0553HH-ACL",
  sourceDocumentVersion: 1,
  sourceUrl: "https://www.uhcprovider.com/content/dam/provider/docs/public/policies/comm-medical-drug/surgery-knee.pdf",
  cptCode: "29888",
  cptDescription: "Arthroscopically aided ACL repair/augmentation or reconstruction",
  payer: "UnitedHealthcare",
  payerPlanCategory: "Commercial",
  title: "ACL Reconstruction — UHC (InterQual delegated)",
  effectiveDate: "2026-03-01",
  active: true,
  lastSyncedAt: NOW,
  criteria: [
    {
      type: "documentation_required",
      description:
        "Clinical criteria per InterQual CP: Procedures — Arthroscopy or Arthroscopically Assisted Surgery, Knee"
    },
    {
      type: "narrative",
      text: "UHC delegates detailed criteria to InterQual (Change Healthcare). Providers must access InterQual directly for point-of-care criteria."
    }
  ]
};

const UHC_SPINE_22612: PayerRule = {
  sourceType: "commercial_policy",
  sourceDocumentId: "2026T0639H-22612",
  sourceDocumentVersion: 1,
  sourceUrl:
    "https://www.uhcprovider.com/content/dam/provider/docs/public/policies/comm-medical-drug/spinal-fusion-decompression.pdf",
  cptCode: "22612",
  cptDescription: "Arthrodesis, posterior or posterolateral technique; lumbar",
  payer: "UnitedHealthcare",
  payerPlanCategory: "Commercial",
  title: "Lumbar Spinal Fusion — UHC (InterQual delegated)",
  effectiveDate: "2026-01-01",
  active: true,
  lastSyncedAt: NOW,
  criteria: [
    {
      type: "threshold",
      measure: "Oswestry Disability Index (ODI)",
      operator: ">",
      value: 8,
      unit: "score"
    },
    {
      type: "documentation_required",
      description:
        "Radicular pain: radiation along spinal nerve root dermatome with positive nerve root tension sign (SLR/femoral tension), asymmetric depressed reflex, asymmetric decreased sensation in dermatomal distribution, OR asymmetric weakness in myotomal distribution. Imaging must show corresponding nerve root compression."
    },
    {
      type: "documentation_required",
      description:
        "Spondylolisthesis significance: sagittal plane displacement >=3mm on flexion/extension views OR relative sagittal plane angulation >11 degrees"
    },
    {
      type: "narrative",
      text: "Detailed criteria delegated to InterQual CP: Procedures (Fusion, Lumbar Spine; Decompression +/- Fusion, Lumbar). Non-covered: isolated facet fusion, dynamic stabilization for degenerative spondylolisthesis, total facet joint arthroplasty, staged multi-site surgery when one session can address all sites. Alternative disability measures: SF-36 Bodily Pain <70 or Physical Function <78."
    }
  ]
};

function makeUhcSpineVariant(cptCode: string, cptDescription: string, docIdSuffix: string): PayerRule {
  return {
    ...UHC_SPINE_22612,
    sourceDocumentId: `2026T0639H-${docIdSuffix}`,
    cptCode,
    cptDescription
  };
}

const UHC_SPINE_22630 = makeUhcSpineVariant(
  "22630",
  "Arthrodesis, posterior interbody technique, including laminectomy and/or discectomy; single interspace, lumbar",
  "22630"
);

const UHC_SPINE_22633 = makeUhcSpineVariant(
  "22633",
  "Arthrodesis, combined posterior or posterolateral technique with posterior interbody technique; single interspace, lumbar",
  "22633"
);

const UHC_SCS_63650: PayerRule = {
  sourceType: "commercial_policy",
  sourceDocumentId: "2026T0567DD-63650",
  sourceDocumentVersion: 1,
  sourceUrl:
    "https://www.uhcprovider.com/content/dam/provider/docs/public/policies/comm-medical-drug/implanted-electrical-stimulator-spinal-cord.pdf",
  cptCode: "63650",
  cptDescription: "Percutaneous implantation of neurostimulator electrode array, epidural",
  payer: "UnitedHealthcare",
  payerPlanCategory: "Commercial",
  title: "Spinal Cord Stimulation — Covered Indications (UHC)",
  effectiveDate: "2026-01-01",
  active: true,
  lastSyncedAt: NOW,
  criteria: [
    {
      type: "comorbidity",
      conditions: [
        "Complex regional pain syndrome (CRPS)",
        "Painful diabetic neuropathy",
        "Failed back surgery syndrome"
      ]
    },
    {
      type: "documentation_required",
      description:
        "Performed according to FDA labeled indications, contraindications, warnings, and precautions. Clinical criteria per InterQual CP: Procedures — Spinal Cord Stimulator (SCS) Insertion."
    },
    {
      type: "narrative",
      text: "NOT covered: chronic intractable back pain without prior spine surgery, refractory angina pectoris. DRG stimulation covered only for CRPS I/II, unproven for all other conditions. Trial should be performed before definitive implantation. All patients should be screened for psychosocial factors including depression (ASRAPM, 2023)."
    }
  ]
};

const UHC_SCS_63685: PayerRule = {
  ...UHC_SCS_63650,
  sourceDocumentId: "2026T0567DD-63685",
  cptCode: "63685",
  cptDescription: "Insertion or replacement of spinal neurostimulator pulse generator or receiver",
  title: "Spinal Cord Stimulator Pulse Generator — Covered Indications (UHC)"
};

// ---------------------------------------------------------------------------
// Aetna — Clinical Policy Bulletins
// ---------------------------------------------------------------------------

const AETNA_CPB0660_TKR: PayerRule = {
  sourceType: "commercial_policy",
  sourceDocumentId: "CPB-0660-TKR",
  sourceDocumentVersion: 1,
  sourceUrl: "https://www.aetna.com/cpb/medical/data/600_699/0660.html",
  cptCode: "27447",
  cptDescription:
    "Arthroplasty, knee, condyle and plateau; medial AND lateral compartments with or without patella resurfacing (total knee arthroplasty)",
  payer: "Aetna",
  payerPlanCategory: "Clinical Policy Bulletin",
  title: "Total Knee Arthroplasty — OA/AVN/RA Criteria (CPB 0660)",
  effectiveDate: "2026-01-01",
  active: true,
  lastSyncedAt: NOW,
  criteria: [
    {
      type: "threshold",
      measure: "Kellgren-Lawrence grade",
      operator: ">=",
      value: 3,
      unit: "grade"
    },
    {
      type: "failed_treatment",
      treatment:
        "Non-surgical management including patient education, active in-person physical therapy, NSAIDs/acetaminophen, weight management, activity modification, bracing, and injections as appropriate",
      durationWeeks: 12
    },
    {
      type: "documentation_required",
      description:
        "Pain and functional disability interfering with ADLs due to osteoarthritis, rheumatoid arthritis, avascular necrosis, or post-traumatic arthritis of the knee"
    },
    {
      type: "documentation_required",
      description: "Physical exam showing limited range of motion, crepitus, or effusion/swelling of knee joint"
    },
    {
      type: "documentation_required",
      description:
        "Radiographic evidence: moderate/severe OA (KL Grade 3 or 4), avascular necrosis of tibial or femoral condyle, or RA with joint space narrowing"
    },
    {
      type: "documentation_required",
      description:
        "At least half of conservative therapy must be formal in-person physical therapy with a licensed physical therapist (not home or virtual PT) within the past year"
    },
    {
      type: "narrative",
      text: "Relative contraindications (BMI >40, age <50) trigger 24-week conservative therapy requirement instead of 12. Absolute contraindications: active joint infection, active systemic bacteremia, corticosteroid injection into the joint within 12 weeks of planned arthroplasty, vascular insufficiency, neuromuscular disease compromising implant stability, osseous abnormalities with inadequate bone stock, allergy to implant components."
    }
  ]
};

const AETNA_CPB0660_UKA: PayerRule = {
  sourceType: "commercial_policy",
  sourceDocumentId: "CPB-0660-UKA",
  sourceDocumentVersion: 1,
  sourceUrl: "https://www.aetna.com/cpb/medical/data/600_699/0660.html",
  cptCode: "27446",
  cptDescription:
    "Arthroplasty, knee, condyle and plateau; medial OR lateral compartment (unicompartmental knee arthroplasty)",
  payer: "Aetna",
  payerPlanCategory: "Clinical Policy Bulletin",
  title: "Unicompartmental Knee Arthroplasty (CPB 0660)",
  effectiveDate: "2026-01-01",
  active: true,
  lastSyncedAt: NOW,
  criteria: [
    {
      type: "threshold",
      measure: "Kellgren-Lawrence grade",
      operator: ">=",
      value: 3,
      unit: "grade"
    },
    {
      type: "threshold",
      measure: "Knee arc of motion",
      operator: ">",
      value: 90,
      unit: "degrees"
    },
    {
      type: "documentation_required",
      description:
        "Advanced OA or post-traumatic arthritis affecting only a single compartment with pain/functional disability interfering with ADLs"
    },
    {
      type: "documentation_required",
      description: "Intact stable ligaments (particularly ACL) and knee arc of motion not limited to 90 degrees or less"
    },
    {
      type: "documentation_required",
      description: "Radiographic evidence of moderate/severe OA (KL Grade 3 or 4) affecting only a single compartment"
    }
  ]
};

const AETNA_CPB0673_MENISCECTOMY: PayerRule = {
  sourceType: "commercial_policy",
  sourceDocumentId: "CPB-0673-MENI",
  sourceDocumentVersion: 1,
  sourceUrl: "https://www.aetna.com/cpb/medical/data/600_699/0673.html",
  cptCode: "29881",
  cptDescription: "Arthroscopy, knee, surgical; meniscectomy (medial OR lateral)",
  payer: "Aetna",
  payerPlanCategory: "Clinical Policy Bulletin",
  title: "Knee Arthroscopy — Meniscectomy (CPB 0673)",
  effectiveDate: "2026-01-01",
  active: true,
  lastSyncedAt: NOW,
  criteria: [
    {
      type: "threshold",
      measure: "Kellgren-Lawrence grade",
      operator: "<=",
      value: 2,
      unit: "grade"
    },
    {
      type: "failed_treatment",
      treatment: "Formal in-person physical therapy",
      durationWeeks: 6
    },
    {
      type: "documentation_required",
      description: "Significant knee pain plus mechanical symptoms (locking, catching, giving way)"
    },
    {
      type: "documentation_required",
      description: "MRI confirmation of traumatic meniscal tear (not degenerative)"
    },
    {
      type: "documentation_required",
      description:
        "Radiologic confirmation of pathology with no more than mild OA (KL 0, 1, or 2; or modified Outerbridge Grade 0, 1, or 2)"
    },
    {
      type: "narrative",
      text: "Conservative treatment requirement waived if knee is locked due to displaced bucket handle tear. Arthroscopic partial meniscectomy for degenerative meniscal tears is considered experimental/investigational. Arthroscopic lavage and debridement for knee pain only or severe OA are not medically necessary. Minor synovectomy (29875) and chondroplasty/debridement (29877) are integral to other arthroscopic knee procedures and not separately billable."
    }
  ]
};

const AETNA_CPB0673_ACL: PayerRule = {
  sourceType: "commercial_policy",
  sourceDocumentId: "CPB-0673-ACL",
  sourceDocumentVersion: 1,
  sourceUrl: "https://www.aetna.com/cpb/medical/data/600_699/0673.html",
  cptCode: "29888",
  cptDescription: "Arthroscopically aided anterior cruciate ligament repair/augmentation or reconstruction",
  payer: "Aetna",
  payerPlanCategory: "Clinical Policy Bulletin",
  title: "ACL Reconstruction (CPB 0673)",
  effectiveDate: "2026-01-01",
  active: true,
  lastSyncedAt: NOW,
  criteria: [
    {
      type: "threshold",
      measure: "Kellgren-Lawrence grade",
      operator: "<=",
      value: 2,
      unit: "grade"
    },
    {
      type: "failed_treatment",
      treatment: "Formal in-person physical therapy",
      durationWeeks: 6
    },
    {
      type: "documentation_required",
      description: "Significant knee pain plus mechanical symptoms with radiologic confirmation of ACL pathology"
    },
    {
      type: "documentation_required",
      description: "No more than mild OA (KL 0, 1, or 2) on imaging"
    }
  ]
};

const AETNA_CPB0837_RCR_OPEN: PayerRule = {
  sourceType: "commercial_policy",
  sourceDocumentId: "CPB-0837-open",
  sourceDocumentVersion: 1,
  sourceUrl: "https://www.aetna.com/cpb/medical/data/800_899/0837.html",
  cptCode: "23412",
  cptDescription: "Repair of ruptured musculotendinous cuff (eg, rotator cuff) open; chronic",
  payer: "Aetna",
  payerPlanCategory: "Clinical Policy Bulletin",
  title: "Rotator Cuff Repair — Open (CPB 0837)",
  effectiveDate: "2026-01-01",
  active: true,
  lastSyncedAt: NOW,
  criteria: [
    {
      type: "threshold",
      measure: "Symptom duration",
      operator: ">=",
      value: 6,
      unit: "months"
    },
    {
      type: "failed_treatment",
      treatment: "Conservative therapy (non-surgical medical management) clearly documented in the medical record",
      durationWeeks: 12
    },
    {
      type: "documentation_required",
      description: "Pain and functional disability of at least 6 months duration interfering with ADLs"
    },
    {
      type: "documentation_required",
      description: "Imaging-confirmed tear (MRI or arthrogram) with functional limitation documented"
    },
    {
      type: "narrative",
      text: "Conservative therapy waiver: trial of conservative therapy is not required for fractures, reconstruction following tumor resection, glenoid bone loss with anterior or posterior subluxation, or avascular necrosis of humeral head with collapse in presence of severe OA. If conservative therapy is not appropriate, medical record must clearly document why."
    }
  ]
};

const AETNA_CPB0837_RCR_ARTHRO: PayerRule = {
  ...AETNA_CPB0837_RCR_OPEN,
  sourceDocumentId: "CPB-0837-arthro",
  cptCode: "29827",
  cptDescription: "Arthroscopy, shoulder, surgical; with rotator cuff repair",
  title: "Rotator Cuff Repair — Arthroscopic (CPB 0837)"
};

const AETNA_CPB0743_SPINE_22612: PayerRule = {
  sourceType: "commercial_policy",
  sourceDocumentId: "CPB-0743-22612",
  sourceDocumentVersion: 1,
  sourceUrl: "https://www.aetna.com/cpb/medical/data/700_799/0743.html",
  cptCode: "22612",
  cptDescription: "Arthrodesis, posterior or posterolateral technique; lumbar",
  payer: "Aetna",
  payerPlanCategory: "Clinical Policy Bulletin",
  title: "Lumbar Spinal Fusion — Posterior/Posterolateral (CPB 0743)",
  effectiveDate: "2026-01-01",
  active: true,
  lastSyncedAt: NOW,
  criteria: [
    {
      type: "documentation_required",
      description:
        "Signs or symptoms of neural compression (radiculopathy, neurogenic claudication, or myelopathy) associated with the levels being treated"
    },
    {
      type: "documentation_required",
      description:
        "Advanced imaging showing central/lateral recess or foraminal stenosis graded as moderate, moderate-to-severe, or severe (not mild or mild-to-moderate), or nerve root/spinal cord compression"
    },
    {
      type: "documentation_required",
      description: "All other reasonable sources of pain and/or neurological deficit have been ruled out"
    },
    {
      type: "failed_treatment",
      treatment:
        "Structured conservative management including formal in-person physical therapy (minimum 6 weeks), NSAIDs, and consideration of epidural steroid injections",
      durationWeeks: 6
    },
    {
      type: "narrative",
      text: "Lumbar spinal fusion for degenerative disc disease alone is NOT medically necessary. Spondylolisthesis alone without documented instability does not meet fusion criteria. Radiologic documentation of at least moderate stenosis or other evidence of neural compression is required. Pedicle screw fixation is medically necessary for: fusion adjacent to prior lumbar fusion, fusion after decompression, pseudoarthrosis repair, spondylolisthesis grades I-IV, spinal trauma, tumor resection, scoliosis/kyphosis requiring instrumentation."
    }
  ]
};

function makeAetnaSpineVariant(cptCode: string, cptDescription: string, docIdSuffix: string): PayerRule {
  return {
    ...AETNA_CPB0743_SPINE_22612,
    sourceDocumentId: `CPB-0743-${docIdSuffix}`,
    cptCode,
    cptDescription
  };
}

const AETNA_CPB0743_SPINE_22630 = makeAetnaSpineVariant(
  "22630",
  "Arthrodesis, posterior interbody technique, including laminectomy and/or discectomy; single interspace, lumbar",
  "22630"
);

const AETNA_CPB0743_SPINE_22633 = makeAetnaSpineVariant(
  "22633",
  "Arthrodesis, combined posterior or posterolateral technique with posterior interbody technique; single interspace, lumbar",
  "22633"
);

const AETNA_CPB0502_NCS: PayerRule = {
  sourceType: "commercial_policy",
  sourceDocumentId: "CPB-0502",
  sourceDocumentVersion: 1,
  sourceUrl: "https://www.aetna.com/cpb/medical/data/500_599/0502.html",
  cptCode: "64721",
  cptDescription: "Neuroplasty and/or transposition; median nerve at carpal tunnel",
  payer: "Aetna",
  payerPlanCategory: "Clinical Policy Bulletin",
  title: "Carpal Tunnel — Nerve Conduction Studies Protocol (CPB 0502)",
  effectiveDate: "2026-01-01",
  active: true,
  lastSyncedAt: NOW,
  criteria: [
    {
      type: "threshold",
      measure: "NCS sessions per year",
      operator: "<=",
      value: 2,
      unit: "sessions"
    },
    {
      type: "documentation_required",
      description:
        "NCS confirming median nerve compression: sensory conduction studies across the wrist of the median nerve, plus one other sensory nerve in the symptomatic limb if results are abnormal"
    },
    {
      type: "documentation_required",
      description:
        "Waveforms reviewed on site in real time with technique adjustments as needed; reports prepared on site by the examiner with interpretation of test results"
    },
    {
      type: "documentation_required",
      description:
        "If initial median sensory NCS across wrist has conduction distance >8 cm and results are normal: comparison with radial or ulnar sensory conduction across wrist in same limb, or median sensory conduction over short (7-8 cm) distance required"
    },
    {
      type: "narrative",
      text: "2 sessions per year is considered appropriate for most conditions including carpal tunnel syndrome. Studies more frequent than twice a year require medical necessity review. F-wave studies are not necessary for carpal tunnel syndrome. Automated NCS devices, surface scanning EMG, and intraoperative NCS during wrist arthroscopy are experimental/investigational."
    }
  ]
};

const AETNA_CPB0194_SCS_63650: PayerRule = {
  sourceType: "commercial_policy",
  sourceDocumentId: "CPB-0194-63650",
  sourceDocumentVersion: 1,
  sourceUrl: "https://www.aetna.com/cpb/medical/data/100_199/0194.html",
  cptCode: "63650",
  cptDescription: "Percutaneous implantation of neurostimulator electrode array, epidural",
  payer: "Aetna",
  payerPlanCategory: "Clinical Policy Bulletin",
  title: "Spinal Cord Stimulation — Permanent Implantation (CPB 0194)",
  effectiveDate: "2026-01-01",
  active: true,
  lastSyncedAt: NOW,
  criteria: [
    {
      type: "threshold",
      measure: "Pain reduction during percutaneous trial",
      operator: ">=",
      value: 50,
      unit: "percent"
    },
    {
      type: "threshold",
      measure: "Percutaneous trial duration",
      operator: ">=",
      value: 3,
      unit: "days"
    },
    {
      type: "threshold",
      measure: "Percutaneous trial duration",
      operator: "<=",
      value: 7,
      unit: "days"
    },
    {
      type: "failed_treatment",
      treatment: "Conservative pain management methods",
      durationWeeks: 26
    },
    {
      type: "comorbidity",
      conditions: [
        "Failed back surgery syndrome (FBSS)",
        "Complex regional pain syndrome (CRPS) Types I and II",
        "Diabetic peripheral neuropathy of lower extremities",
        "Intractable low back pain with radicular pain",
        "Radicular pain syndrome",
        "Arachnoiditis"
      ]
    },
    {
      type: "documentation_required",
      description: "Psychological evaluation completed prior to implantation"
    },
    {
      type: "documentation_required",
      description:
        "Significant pain reduction (50% or more) demonstrated during 3- to 7-day trial of percutaneous spinal stimulation"
    },
    {
      type: "narrative",
      text: "Not medically necessary for headache, occipital neuralgia, or intractable angina. High-frequency SCS (Senza/HF10), burst stimulation (BurstDR), and differential target multiplexed stimulation (Medtronic DTM) are considered equally effective alternatives. Replacement of existing DCS/battery is medically necessary when member has positive pain relief response and device is out of warranty and cannot be repaired."
    }
  ]
};

const AETNA_CPB0194_SCS_63685: PayerRule = {
  ...AETNA_CPB0194_SCS_63650,
  sourceDocumentId: "CPB-0194-63685",
  cptCode: "63685",
  cptDescription: "Insertion or replacement of spinal neurostimulator pulse generator or receiver",
  title: "Spinal Cord Stimulator Pulse Generator (CPB 0194)"
};

const AETNA_CPB0591_CERVICAL_DISC: PayerRule = {
  sourceType: "commercial_policy",
  sourceDocumentId: "CPB-0591",
  sourceDocumentVersion: 1,
  sourceUrl: "https://www.aetna.com/cpb/medical/data/500_599/0591.html",
  cptCode: "22856",
  cptDescription:
    "Total disc arthroplasty (artificial disc), anterior approach, including discectomy; single interspace, cervical",
  payer: "Aetna",
  payerPlanCategory: "Clinical Policy Bulletin",
  title: "Cervical Disc Arthroplasty — Single Level (CPB 0591)",
  effectiveDate: "2026-01-01",
  active: true,
  lastSyncedAt: NOW,
  criteria: [
    {
      type: "failed_treatment",
      treatment:
        "Conservative therapy including patient education, active in-person physical therapy (not home or virtual PT), and medications (NSAIDs, acetaminophen, or tricyclic antidepressants)",
      durationWeeks: 6
    },
    {
      type: "documentation_required",
      description:
        "Signs or symptoms of neural compression (radiculopathy, neurogenic claudication, or myelopathy) associated with the levels being treated"
    },
    {
      type: "documentation_required",
      description:
        "Central/lateral recess or foraminal stenosis graded as moderate, moderate-to-severe, or severe (not mild or mild-to-moderate)"
    },
    {
      type: "documentation_required",
      description: "No radiologic evidence of segmental instability"
    },
    {
      type: "documentation_required",
      description: "All other reasonable sources of pain and/or neurological deficit have been ruled out"
    },
    {
      type: "documentation_required",
      description:
        "Conservative measures must be recent (within the past year) with PT participation for entire required duration (6 weeks minimum)"
    },
    {
      type: "threshold",
      measure: "HbA1c (diabetic members)",
      operator: "<",
      value: 8,
      unit: "percent"
    },
    {
      type: "narrative",
      text: "Cervical levels C3-C7 covered, 1-2 levels. HbA1c <8% requirement for diabetics is waived if myelopathy, cauda equina syndrome, severe weakness (MRC scale 4- or less), or progressive weakness is present. Device-specific age requirements: Bryan >=21, Mobi-C 21-67, Prestige/Prestige LP 21-78. Lumbar partial disc prosthetics, lumbar prosthetic discs at more than one level, and TOPS System are experimental/investigational."
    }
  ]
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const commercialPayerRules: PayerRule[] = [
  // Cigna / eviCore
  CIGNA_CMM311_TKR,
  CIGNA_CMM311_PKR,
  CIGNA_CMM312_ACL,
  CIGNA_CMM315_RCR_OPEN,
  CIGNA_CMM315_RCR_ARTHRO,
  CIGNA_LUMBAR_FUSION_22612,
  CIGNA_LUMBAR_FUSION_22630,
  CIGNA_LUMBAR_FUSION_22633,
  CIGNA_CARPAL_TUNNEL,
  // UnitedHealthcare
  UHC_KNEE_TKR,
  UHC_KNEE_PKR,
  UHC_KNEE_MENISCECTOMY,
  UHC_KNEE_ACL,
  UHC_SPINE_22612,
  UHC_SPINE_22630,
  UHC_SPINE_22633,
  UHC_SCS_63650,
  UHC_SCS_63685,
  // Aetna — Clinical Policy Bulletins
  AETNA_CPB0660_TKR,
  AETNA_CPB0660_UKA,
  AETNA_CPB0673_MENISCECTOMY,
  AETNA_CPB0673_ACL,
  AETNA_CPB0837_RCR_OPEN,
  AETNA_CPB0837_RCR_ARTHRO,
  AETNA_CPB0743_SPINE_22612,
  AETNA_CPB0743_SPINE_22630,
  AETNA_CPB0743_SPINE_22633,
  AETNA_CPB0502_NCS,
  AETNA_CPB0194_SCS_63650,
  AETNA_CPB0194_SCS_63685,
  AETNA_CPB0591_CERVICAL_DISC
];
