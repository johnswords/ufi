export class OllamaConnectionError extends Error {
  public override readonly cause: unknown;

  public constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "OllamaConnectionError";
    this.cause = options?.cause;
  }
}

export class ExtractionError extends Error {
  public constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ExtractionError";
  }
}
