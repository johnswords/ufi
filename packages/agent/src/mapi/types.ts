export const supportedDataQueries = [
  "patient_procedures",
  "patient_clinical_notes",
  "patient_problems",
  "patient_insurance_providers",
  "patient_medications",
  "patient_assessment_plan"
] as const;

export type MapiDataQuery = (typeof supportedDataQueries)[number];

export interface PocLocation {
  readonly pocId: string;
  readonly pocName: string;
}

export interface MapiQueryPatientDataInput {
  readonly pocId: string;
  readonly token: string;
  readonly queries: readonly MapiDataQuery[];
  readonly beginDate?: string;
  readonly endDate?: string;
  readonly refreshCredentials?: {
    readonly patientId: string;
    readonly patientPassword: string;
  };
}

export interface MapiPatientDataResponse {
  readonly statusCode: 200;
  readonly patientData: string;
  readonly rawXml: string;
}
