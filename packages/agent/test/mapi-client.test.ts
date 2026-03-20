import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  MapiPatientAuthError,
  MapiTokenError,
  MapiValidationError,
  MapiClient
} from "../src/index.js";

function readFixture(name: string): string {
  return readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
}

type RecordedRequest = {
  readonly endpoint: string;
  readonly bodyIncludes?: string[];
  readonly responseFixture: string;
};

function createFixtureFetch(sequence: RecordedRequest[]): typeof fetch {
  let index = 0;

  return (async (input, init) => {
    const current = sequence[index];
    if (!current) {
      throw new Error("Unexpected extra fetch call.");
    }

    index += 1;
    const url = String(input);
    const body = typeof init?.body === "string" ? init.body : "";

    expect(url).toContain(current.endpoint);
    for (const expected of current.bodyIncludes ?? []) {
      expect(body).toContain(expected);
    }

    return new Response(readFixture(current.responseFixture), {
      status: 200,
      headers: {
        "content-type": "application/xml"
      }
    });
  }) as typeof fetch;
}

describe("MapiClient", () => {
  it("returns parsed POC locations", async () => {
    const client = new MapiClient({
      registrationId: "reg-123",
      fetchImpl: createFixtureFetch([
        {
          endpoint: "pocquery.php",
          bodyIncludes: ["registration_id=reg-123"],
          responseFixture: "pocquery.success.xml"
        }
      ])
    });

    await expect(client.getPocLocations()).resolves.toEqual([
      { pocId: "PRACTICE-01", pocName: "Example Practice" },
      { pocId: "PRACTICE-02", pocName: "Second Practice" }
    ]);
  });

  it("returns a patient token", async () => {
    const client = new MapiClient({
      registrationId: "reg-123",
      fetchImpl: createFixtureFetch([
        {
          endpoint: "index.php",
          bodyIncludes: ["poc_id=PRACTICE-01", "patient_id=portal-user", "patient_pw=secret"],
          responseFixture: "patient-token.success.xml"
        }
      ])
    });

    await expect(client.getPatientToken("PRACTICE-01", "portal-user", "secret")).resolves.toBe(
      "TOKEN-123"
    );
  });

  it("queries patient data and joins multiple queries with #", async () => {
    const client = new MapiClient({
      registrationId: "reg-123",
      fetchImpl: createFixtureFetch([
        {
          endpoint: "index.php",
          bodyIncludes: [
            "patient_token=TOKEN-123",
            "data_query=patient_clinical_notes%23patient_problems%23patient_procedures"
          ],
          responseFixture: "patient-data.success.xml"
        }
      ])
    });

    const result = await client.queryPatientData({
      pocId: "PRACTICE-01",
      token: "TOKEN-123",
      queries: ["patient_clinical_notes", "patient_problems", "patient_procedures"]
    });

    expect(result.patientData).toBe("Q0RBLURBVEE=");
  });

  it("refreshes the token once on TOKEN_EXPIRED when credentials are available", async () => {
    const client = new MapiClient({
      registrationId: "reg-123",
      fetchImpl: createFixtureFetch([
        {
          endpoint: "index.php",
          bodyIncludes: ["patient_token=OLD-TOKEN"],
          responseFixture: "patient-data.token-expired.xml"
        },
        {
          endpoint: "index.php",
          bodyIncludes: ["patient_id=portal-user", "patient_pw=secret"],
          responseFixture: "patient-token.refreshed.xml"
        },
        {
          endpoint: "index.php",
          bodyIncludes: ["patient_token=TOKEN-456"],
          responseFixture: "patient-data.success.xml"
        }
      ])
    });

    const result = await client.queryPatientData({
      pocId: "PRACTICE-01",
      token: "OLD-TOKEN",
      queries: ["patient_clinical_notes"],
      refreshCredentials: {
        patientId: "portal-user",
        patientPassword: "secret"
      }
    });

    expect(result.patientData).toBe("Q0RBLURBVEE=");
  });

  it("throws typed patient auth errors", async () => {
    const client = new MapiClient({
      registrationId: "reg-123",
      fetchImpl: createFixtureFetch([
        {
          endpoint: "index.php",
          responseFixture: "patient-token.invalid-password.xml"
        }
      ])
    });

    await expect(client.getPatientToken("PRACTICE-01", "portal-user", "wrong")).rejects.toBeInstanceOf(
      MapiPatientAuthError
    );
  });

  it("throws a token error when refresh credentials are unavailable", async () => {
    const client = new MapiClient({
      registrationId: "reg-123",
      fetchImpl: createFixtureFetch([
        {
          endpoint: "index.php",
          responseFixture: "patient-data.token-expired.xml"
        }
      ])
    });

    await expect(
      client.queryPatientData({
        pocId: "PRACTICE-01",
        token: "OLD-TOKEN",
        queries: ["patient_clinical_notes"]
      })
    ).rejects.toBeInstanceOf(MapiTokenError);
  });

  it("maps validation failures to typed errors", async () => {
    const client = new MapiClient({
      registrationId: "reg-123",
      fetchImpl: createFixtureFetch([
        {
          endpoint: "index.php",
          responseFixture: "patient-data.field-empty.xml"
        }
      ])
    });

    await expect(
      client.queryPatientData({
        pocId: "PRACTICE-01",
        token: "TOKEN-123",
        queries: ["patient_clinical_notes"]
      })
    ).rejects.toBeInstanceOf(MapiValidationError);
  });
});
