export type CdaParseErrorCode =
  | "EMPTY_INPUT"
  | "INVALID_BASE64"
  | "XML_PARSE_ERROR"
  | "INVALID_DOCUMENT";

export class CdaParseError extends Error {
  public readonly code: CdaParseErrorCode;
  public readonly context?: Record<string, unknown>;

  public constructor(
    code: CdaParseErrorCode,
    message: string,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "CdaParseError";
    this.code = code;
    if (context) {
      this.context = context;
    }
  }
}
