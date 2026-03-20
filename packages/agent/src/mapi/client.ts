import { createMapiError, MapiRateLimitError, type MapiStatusCode, MapiTokenError } from "./errors.js";
import type { MapiDataQuery, MapiPatientDataResponse, MapiQueryPatientDataInput, PocLocation } from "./types.js";
import { parseMapiResponseXml } from "./xml.js";

const defaultBaseUrl = "https://www.medentmobile.com/mapi/services";

export interface MapiClientOptions {
  readonly registrationId: string;
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
  readonly rateLimitRetries?: number;
  readonly rateLimitBackoffMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function buildDateFields(beginDate?: string, endDate?: string): Record<string, string> {
  if (!beginDate) {
    return {};
  }

  if (endDate) {
    return { begin_date: beginDate, end_date: endDate };
  }

  return { begin_date: beginDate };
}

function encodeQueries(queries: readonly MapiDataQuery[]): string {
  return queries.join("#");
}

export class MapiClient {
  private readonly registrationId: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly rateLimitRetries: number;
  private readonly rateLimitBackoffMs: number;

  public constructor(options: MapiClientOptions) {
    this.registrationId = options.registrationId;
    this.baseUrl = options.baseUrl ?? defaultBaseUrl;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.rateLimitRetries = options.rateLimitRetries ?? 2;
    this.rateLimitBackoffMs = options.rateLimitBackoffMs ?? 50;
  }

  public async getPocLocations(): Promise<PocLocation[]> {
    const response = await this.postForm("pocquery.php", {
      registration_id: this.registrationId
    });

    if (response.statusCode !== 200) {
      throw createMapiError(response.statusCode);
    }

    return response.pocLocations;
  }

  public async getPatientToken(pocId: string, patientId: string, patientPassword: string): Promise<string> {
    const response = await this.postForm("index.php", {
      registration_id: this.registrationId,
      poc_id: pocId,
      patient_id: patientId,
      patient_pw: patientPassword
    });

    if (response.statusCode !== 200) {
      throw createMapiError(response.statusCode);
    }

    if (!response.patientToken) {
      throw new Error("MAPI patient token response did not include a patient_token.");
    }

    return response.patientToken;
  }

  public async queryPatientData(input: MapiQueryPatientDataInput): Promise<MapiPatientDataResponse> {
    return this.queryPatientDataInternal(input, false);
  }

  private async queryPatientDataInternal(
    input: MapiQueryPatientDataInput,
    hasRefreshed: boolean
  ): Promise<MapiPatientDataResponse> {
    const response = await this.postForm("index.php", {
      registration_id: this.registrationId,
      poc_id: input.pocId,
      patient_token: input.token,
      data_query: encodeQueries(input.queries),
      ...buildDateFields(input.beginDate, input.endDate)
    });

    if (response.statusCode === 200) {
      if (!response.patientData) {
        throw new Error("MAPI data response did not include patient_data.");
      }

      return {
        statusCode: 200,
        patientData: response.patientData,
        rawXml: response.rawXml
      };
    }

    if ((response.statusCode === 427 || response.statusCode === 432) && input.refreshCredentials && !hasRefreshed) {
      const refreshedToken = await this.getPatientToken(
        input.pocId,
        input.refreshCredentials.patientId,
        input.refreshCredentials.patientPassword
      );

      return this.queryPatientDataInternal(
        {
          ...input,
          token: refreshedToken
        },
        true
      );
    }

    throw createMapiError(response.statusCode);
  }

  private async postForm(
    endpoint: string,
    fields: Record<string, string>,
    attempt = 0
  ): Promise<ReturnType<typeof parseMapiResponseXml>> {
    const response = await this.fetchImpl(`${this.baseUrl}/${endpoint}`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams(fields).toString()
    });

    const xml = await response.text();
    const parsed = parseMapiResponseXml(xml);

    if (parsed.statusCode === 421 && attempt < this.rateLimitRetries) {
      await sleep(this.rateLimitBackoffMs * (attempt + 1));
      return this.postForm(endpoint, fields, attempt + 1);
    }

    if (parsed.statusCode === 421 && attempt >= this.rateLimitRetries) {
      throw new MapiRateLimitError();
    }

    return parsed;
  }
}

export function isExpiredTokenStatus(statusCode: MapiStatusCode): boolean {
  return statusCode === 427 || statusCode === 432;
}

export function isTokenError(error: unknown): error is MapiTokenError {
  return error instanceof MapiTokenError;
}
