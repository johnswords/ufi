import { XMLParser, XMLValidator } from "fast-xml-parser";

import type { MapiStatusCode } from "./errors.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
  parseTagValue: false
});

interface ParsedResponseEnvelope {
  readonly statusCode: MapiStatusCode;
  readonly rawXml: string;
  readonly patientToken: string | undefined;
  readonly patientData: string | undefined;
  readonly pocLocations: Array<{
    readonly pocId: string;
    readonly pocName: string;
  }>;
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

export function parseMapiResponseXml(xml: string): ParsedResponseEnvelope {
  const validation = XMLValidator.validate(xml);
  if (validation !== true) {
    throw new Error(`Invalid MAPI XML: ${validation.err.msg}`);
  }

  const parsed = parser.parse(xml) as {
    response?: {
      status?: string;
      patient_token?: string;
      patient_data?: string;
      poc?: Array<{ pocname?: string; pocid?: string }> | { pocname?: string; pocid?: string };
    };
  };

  const response = parsed.response;
  if (!response?.status) {
    throw new Error("MAPI response is missing <status>.");
  }

  const statusCode = Number.parseInt(response.status, 10) as MapiStatusCode;
  if (Number.isNaN(statusCode)) {
    throw new Error(`MAPI response had a non-numeric status: ${response.status}`);
  }

  return {
    statusCode,
    rawXml: xml,
    patientToken: response.patient_token?.trim(),
    patientData: response.patient_data?.trim(),
    pocLocations: asArray(response.poc).flatMap((entry) => {
      if (!entry?.pocid || !entry.pocname) {
        return [];
      }

      return [
        {
          pocId: entry.pocid.trim(),
          pocName: entry.pocname.trim()
        }
      ];
    })
  };
}
