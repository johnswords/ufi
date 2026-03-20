export interface CptCodeEntry {
  code: string;
  description: string;
}

/** Target ortho/spinal CPT codes covered by our payer rules. */
export const cptCodes: CptCodeEntry[] = [
  { code: "27447", description: "Total knee arthroplasty (TKR)" },
  { code: "27446", description: "Unicompartmental knee arthroplasty (partial knee)" },
  { code: "29888", description: "Arthroscopic ACL reconstruction" },
  { code: "29881", description: "Arthroscopic knee meniscectomy" },
  { code: "23412", description: "Open rotator cuff repair" },
  { code: "29827", description: "Arthroscopic rotator cuff repair" },
  { code: "22612", description: "Posterior lumbar spinal fusion" },
  { code: "22630", description: "Posterior interbody lumbar fusion (PLIF)" },
  { code: "22633", description: "Combined posterior/interbody lumbar fusion" },
  { code: "22856", description: "Cervical total disc arthroplasty" },
  { code: "64721", description: "Carpal tunnel release" },
  { code: "63650", description: "Percutaneous spinal cord stimulator electrode implant" },
  { code: "63685", description: "Spinal cord stimulator pulse generator insertion" }
];
