export class CmsClientError extends Error {
  public readonly endpoint: string;
  public readonly httpStatus?: number;
  public readonly cmsStatusId?: number;

  public constructor(
    message: string,
    options: {
      endpoint: string;
      httpStatus?: number;
      cmsStatusId?: number;
    }
  ) {
    super(message);
    this.name = "CmsClientError";
    this.endpoint = options.endpoint;
    if (options.httpStatus !== undefined) {
      this.httpStatus = options.httpStatus;
    }
    if (options.cmsStatusId !== undefined) {
      this.cmsStatusId = options.cmsStatusId;
    }
  }
}
