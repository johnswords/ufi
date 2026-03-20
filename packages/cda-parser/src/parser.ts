import {
  type AssessmentPlan,
  type CdaDocument,
  type ClinicalNote,
  type InsuranceProvider,
  type Medication,
  type Problem,
  type Procedure,
  type VitalSign
} from "@ufi/shared";
import { XMLParser, XMLValidator } from "fast-xml-parser";

import { CdaParseError } from "./errors.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseTagValue: false,
  trimValues: false,
  removeNSPrefix: true
});

const sectionMatchers = {
  clinicalNotes: {
    codes: new Set(["34109-9", "11506-3"]),
    templateIds: new Set([
      "2.16.840.1.113883.10.20.22.2.20",
      "2.16.840.1.113883.10.20.22.2.20.1"
    ])
  },
  problems: {
    codes: new Set(["11450-4"]),
    templateIds: new Set(["2.16.840.1.113883.10.20.22.2.5.1"])
  },
  procedures: {
    codes: new Set(["47519-4", "29554-3"]),
    templateIds: new Set(["2.16.840.1.113883.10.20.22.2.7.1"])
  },
  medications: {
    codes: new Set(["10160-0"]),
    templateIds: new Set(["2.16.840.1.113883.10.20.22.2.1.1"])
  },
  insuranceProviders: {
    codes: new Set(["48768-6"]),
    templateIds: new Set(["2.16.840.1.113883.10.20.22.2.18"])
  },
  assessmentPlan: {
    codes: new Set(["51847-2", "18776-5"]),
    templateIds: new Set(["2.16.840.1.113883.10.20.22.2.10"])
  },
  vitalSigns: {
    codes: new Set(["8716-3"]),
    templateIds: new Set(["2.16.840.1.113883.10.20.22.2.4.1"])
  }
};

type ParsedXml = Record<string, unknown>;

interface SectionNode extends Record<string, unknown> {
  code?: { code?: string; displayName?: string };
  templateId?: unknown;
  title?: string;
  text?: unknown;
  entry?: unknown;
}

function ensureArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return undefined;
}

function getNestedRecord(value: unknown, ...path: string[]): Record<string, unknown> | undefined {
  let current = asRecord(value);
  for (const key of path) {
    current = asRecord(current?.[key]);
    if (!current) {
      return undefined;
    }
  }

  return current;
}

function getNestedString(value: unknown, ...path: string[]): string | undefined {
  let current: unknown = value;
  for (const key of path) {
    current = asRecord(current)?.[key];
    if (current === undefined) {
      return undefined;
    }
  }

  return asString(current);
}

function collectText(value: unknown): string[] {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectText(entry));
  }

  if (value && typeof value === "object") {
    return Object.values(value).flatMap((entry) => collectText(entry));
  }

  return [];
}

function getTemplateIds(section: SectionNode): string[] {
  return ensureArray(section.templateId)
    .map((templateId) => asRecord(templateId)?.root)
    .map((root) => asString(root))
    .filter((root): root is string => Boolean(root));
}

function parseHl7Timestamp(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  if (/^\d{8}$/.test(normalized)) {
    const year = normalized.slice(0, 4);
    const month = normalized.slice(4, 6);
    const day = normalized.slice(6, 8);
    return `${year}-${month}-${day}T00:00:00.000Z`;
  }

  const match = normalized.match(
    /^(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?(?:([+-]\d{2})(\d{2}))?$/
  );
  if (!match) {
    return undefined;
  }

  const [, year, month, day, hour = "00", minute = "00", second = "00", offsetHour, offsetMinute] =
    match;

  if (offsetHour && offsetMinute) {
    return `${year}-${month}-${day}T${hour}:${minute}:${second}${offsetHour}:${offsetMinute}`;
  }

  return `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
}

function normalizeXml(input: string | Buffer): string {
  const rawInput = Buffer.isBuffer(input) ? input.toString("utf8") : input;
  const trimmed = rawInput.trim();

  if (!trimmed) {
    throw new CdaParseError("EMPTY_INPUT", "CDA input was empty.");
  }

  if (trimmed.startsWith("<")) {
    return trimmed;
  }

  if (!/^[A-Za-z0-9+/=\s]+$/.test(trimmed)) {
    throw new CdaParseError("INVALID_BASE64", "CDA input was not XML and was not valid base64.");
  }

  const sanitized = trimmed.replace(/\s+/g, "");
  const decodedBuffer = Buffer.from(sanitized, "base64");
  const decoded = decodedBuffer.toString("utf8");
  const normalizedXml = decoded.trim();
  const reencoded = decodedBuffer.toString("base64").replace(/=+$/u, "");
  const comparable = sanitized.replace(/=+$/u, "");
  if (!normalizedXml.startsWith("<") || reencoded !== comparable) {
    throw new CdaParseError("INVALID_BASE64", "Decoded base64 did not produce CDA XML.", {
      sample: decoded.slice(0, 32),
      base64Length: sanitized.length
    });
  }

  return normalizedXml;
}

function getStructuredBodySections(documentNode: ParsedXml): SectionNode[] {
  const components = ensureArray(
    getNestedRecord(documentNode, "ClinicalDocument", "component", "structuredBody")?.component
  );

  return components
    .map((component) => asRecord(component)?.section as SectionNode | undefined)
    .filter((section): section is SectionNode => Boolean(section));
}

function getSectionKey(section: SectionNode): keyof typeof sectionMatchers | undefined {
  const code = section.code?.code;
  const templateIds = getTemplateIds(section);
  const title = section.title?.toLowerCase();

  for (const [key, matcher] of Object.entries(sectionMatchers) as Array<
    [keyof typeof sectionMatchers, (typeof sectionMatchers)[keyof typeof sectionMatchers]]
  >) {
    if (templateIds.some((templateId) => matcher.templateIds.has(templateId))) {
      return key;
    }

    if (code && matcher.codes.has(code)) {
      return key;
    }
  }

  if (title?.includes("problem")) {
    return "problems";
  }
  if (title?.includes("procedure")) {
    return "procedures";
  }
  if (title?.includes("medication")) {
    return "medications";
  }
  if (title?.includes("insurance")) {
    return "insuranceProviders";
  }
  if (title?.includes("assessment") || title?.includes("plan")) {
    return "assessmentPlan";
  }
  if (title?.includes("vital")) {
    return "vitalSigns";
  }
  if (title?.includes("note") || title?.includes("history")) {
    return "clinicalNotes";
  }

  return undefined;
}

function parseClinicalNotes(section: SectionNode): ClinicalNote[] {
  const sectionText = collectText(section.text).join("\n").trim();
  const entries = ensureArray(section.entry);
  if (entries.length === 0 && sectionText) {
    return [
      {
        id: "clinical-note-1",
        text: sectionText
      }
    ];
  }

  return entries.flatMap((entry, index) => {
    const act = getNestedRecord(entry, "act") ?? getNestedRecord(entry, "observation");
    const text =
      getNestedString(act, "text") ??
      collectText(asRecord(act)?.text).join(" ").trim() ??
      sectionText;

    if (!text) {
      return [];
    }

    return [
      {
        id: getNestedString(act, "id", "extension") ?? `clinical-note-${index + 1}`,
        text,
        authoredAt: parseHl7Timestamp(getNestedString(act, "effectiveTime", "value")),
        author: getNestedString(act, "author", "assignedAuthor", "assignedPerson", "name")
      }
    ];
  });
}

function parseProblems(section: SectionNode): Problem[] {
  return ensureArray(section.entry).flatMap((entry) => {
    const observation =
      getNestedRecord(entry, "act", "entryRelationship", "observation") ??
      getNestedRecord(entry, "observation");
    const code = getNestedString(observation, "value", "code") ?? getNestedString(observation, "code", "code");
    const description =
      getNestedString(observation, "value", "displayName") ??
      getNestedString(observation, "code", "displayName") ??
      collectText(asRecord(observation)?.text).join(" ").trim();

    if (!code || !description) {
      return [];
    }

    return [
      {
        code,
        description,
        status: getNestedString(observation, "statusCode", "code")
      }
    ];
  });
}

function parseProcedures(section: SectionNode): Procedure[] {
  return ensureArray(section.entry).flatMap((entry) => {
    const procedure = getNestedRecord(entry, "procedure") ?? getNestedRecord(entry, "act");
    const code = getNestedString(procedure, "code", "code");
    const description = getNestedString(procedure, "code", "displayName");

    if (!code || !description) {
      return [];
    }

    return [
      {
        code,
        description,
        performedAt: parseHl7Timestamp(getNestedString(procedure, "effectiveTime", "value"))
      }
    ];
  });
}

function parseMedications(section: SectionNode): Medication[] {
  return ensureArray(section.entry).flatMap((entry) => {
    const supply =
      getNestedRecord(entry, "substanceAdministration", "consumable", "manufacturedProduct", "manufacturedMaterial") ??
      getNestedRecord(entry, "supply");
    const code = getNestedString(supply, "code", "code");
    const name =
      getNestedString(supply, "code", "displayName") ?? getNestedString(supply, "name");

    if (!name) {
      return [];
    }

    return [
      {
        code,
        name,
        dosage: getNestedString(entry, "substanceAdministration", "doseQuantity", "value"),
        status: getNestedString(entry, "substanceAdministration", "statusCode", "code")
      }
    ];
  });
}

function parseInsuranceProviders(section: SectionNode): InsuranceProvider[] {
  return ensureArray(section.entry).flatMap((entry) => {
    const performer =
      getNestedRecord(entry, "act", "performer", "assignedEntity") ??
      getNestedRecord(entry, "participant", "participantRole");
    const name =
      getNestedString(performer, "representedOrganization", "name") ??
      getNestedString(performer, "playingEntity", "name") ??
      collectText(asRecord(entry)?.text).join(" ").trim();

    if (!name) {
      return [];
    }

    return [
      {
        name,
        payerType: getNestedString(performer, "code", "displayName"),
        planCategory: getNestedString(performer, "id", "extension")
      }
    ];
  });
}

function parseAssessmentPlan(section: SectionNode): AssessmentPlan | null {
  const paragraphs = collectText(section.text).join("\n").trim();
  if (!paragraphs) {
    return null;
  }

  const parts = paragraphs.split(/\n+/u).map((part) => part.trim()).filter(Boolean);
  const assessment = parts.find((part) => /assessment/i.test(part));
  const plan = parts.find((part) => /plan/i.test(part));

  return {
    assessment: assessment ?? parts[0],
    plan: plan ?? parts.at(-1)
  };
}

function parseVitalSigns(section: SectionNode): VitalSign[] {
  return ensureArray(section.entry).flatMap((entry) => {
    const organizer = getNestedRecord(entry, "organizer");
    const observations = organizer
      ? ensureArray(organizer.component).map((component) => getNestedRecord(component, "observation"))
      : [getNestedRecord(entry, "observation")];

    return observations.flatMap((observation) => {
      const value = Number(getNestedString(observation, "value", "value"));
      if (!Number.isFinite(value)) {
        return [];
      }

      return [
        {
          type:
            getNestedString(observation, "code", "displayName") ??
            getNestedString(observation, "code", "code") ??
            "unknown",
          value,
          unit: getNestedString(observation, "value", "unit"),
          recordedAt: parseHl7Timestamp(getNestedString(observation, "effectiveTime", "value"))
        }
      ];
    });
  });
}

export function parseCdaDocument(input: string | Buffer): CdaDocument {
  const xml = normalizeXml(input);
  const validation = XMLValidator.validate(xml);
  if (validation !== true) {
    throw new CdaParseError("XML_PARSE_ERROR", "CDA XML failed validation.", {
      error: validation.err
    });
  }

  let parsed: ParsedXml;
  try {
    parsed = parser.parse(xml) as ParsedXml;
  } catch (error) {
    throw new CdaParseError("XML_PARSE_ERROR", "Unable to parse CDA XML.", {
      cause: error instanceof Error ? error.message : String(error)
    });
  }

  if (!getNestedRecord(parsed, "ClinicalDocument")) {
    throw new CdaParseError("INVALID_DOCUMENT", "XML did not contain a ClinicalDocument root.");
  }

  const result: CdaDocument = {
    clinicalNotes: [],
    problems: [],
    procedures: [],
    medications: [],
    insuranceProviders: [],
    assessmentPlan: null,
    vitalSigns: [],
    raw: parsed
  };

  for (const section of getStructuredBodySections(parsed)) {
    switch (getSectionKey(section)) {
      case "clinicalNotes":
        result.clinicalNotes.push(...parseClinicalNotes(section));
        break;
      case "problems":
        result.problems.push(...parseProblems(section));
        break;
      case "procedures":
        result.procedures.push(...parseProcedures(section));
        break;
      case "medications":
        result.medications.push(...parseMedications(section));
        break;
      case "insuranceProviders":
        result.insuranceProviders.push(...parseInsuranceProviders(section));
        break;
      case "assessmentPlan":
        result.assessmentPlan ??= parseAssessmentPlan(section);
        break;
      case "vitalSigns":
        result.vitalSigns.push(...parseVitalSigns(section));
        break;
      default:
        break;
    }
  }

  return result;
}
