export type MapiStatusCode =
  | 200
  | 418
  | 419
  | 420
  | 421
  | 422
  | 423
  | 424
  | 427
  | 428
  | 429
  | 430
  | 431
  | 432
  | 433;

export const mapiStatusNames: Record<MapiStatusCode, string> = {
  200: "SUCCESS",
  418: "AUTH_FAILED_NO_DATA",
  419: "AUTH_FAILED",
  420: "NOT_IMPLEMENTED",
  421: "OVER_LIMIT",
  422: "FIELD_EMPTY",
  423: "FIELD_INVALID",
  424: "NO_ACCESS",
  427: "EXPIRED",
  428: "INVALID_USER",
  429: "INVALID_PASSWORD",
  430: "PATIENT_NOT_ACTIVE",
  431: "PATIENT_ACCOUNT_FROZEN",
  432: "TOKEN_EXPIRED",
  433: "TOKEN_INVALID"
};

export class MapiError extends Error {
  public readonly statusCode: MapiStatusCode;
  public readonly statusName: string;

  public constructor(statusCode: MapiStatusCode, message?: string) {
    super(message ?? mapiStatusNames[statusCode]);
    this.name = "MapiError";
    this.statusCode = statusCode;
    this.statusName = mapiStatusNames[statusCode];
  }
}

export class MapiAuthError extends MapiError {
  public constructor(statusCode: 418 | 419) {
    super(statusCode);
    this.name = "MapiAuthError";
  }
}

export class MapiUnsupportedError extends MapiError {
  public constructor() {
    super(420);
    this.name = "MapiUnsupportedError";
  }
}

export class MapiRateLimitError extends MapiError {
  public constructor() {
    super(421);
    this.name = "MapiRateLimitError";
  }
}

export class MapiValidationError extends MapiError {
  public constructor(statusCode: 422 | 423) {
    super(statusCode);
    this.name = "MapiValidationError";
  }
}

export class MapiAccessError extends MapiError {
  public constructor() {
    super(424);
    this.name = "MapiAccessError";
  }
}

export class MapiPatientAuthError extends MapiError {
  public constructor(statusCode: 428 | 429 | 430 | 431) {
    super(statusCode);
    this.name = "MapiPatientAuthError";
  }
}

export class MapiTokenError extends MapiError {
  public constructor(statusCode: 427 | 432 | 433) {
    super(statusCode);
    this.name = "MapiTokenError";
  }
}

export function createMapiError(statusCode: MapiStatusCode): MapiError {
  switch (statusCode) {
    case 418:
    case 419:
      return new MapiAuthError(statusCode);
    case 420:
      return new MapiUnsupportedError();
    case 421:
      return new MapiRateLimitError();
    case 422:
    case 423:
      return new MapiValidationError(statusCode);
    case 424:
      return new MapiAccessError();
    case 427:
    case 432:
    case 433:
      return new MapiTokenError(statusCode);
    case 428:
    case 429:
    case 430:
    case 431:
      return new MapiPatientAuthError(statusCode);
    default:
      return new MapiError(statusCode);
  }
}
