import type {
  ApiErrorPayload,
  ApiFieldError,
  ErrorParams,
  JsonObject,
} from "./types.js";

export const CORE_ERROR_CODES = {
  invalidResponse: "invalid_error_response",
  network: "network_error",
  timeout: "request_timeout",
  aborted: "request_aborted",
} as const;

export type CoreErrorCode =
  (typeof CORE_ERROR_CODES)[keyof typeof CORE_ERROR_CODES];

export class ApiError<
  TCode extends string = string,
  TFieldCode extends string = string,
> extends Error {
  readonly status: number;
  readonly code: TCode;
  readonly params?: ErrorParams;
  readonly fields: readonly ApiFieldError<TFieldCode>[];
  readonly details?: JsonObject;
  readonly requestId?: string;
  readonly retryAfterSeconds?: number;

  constructor(
    status: number,
    payload: ApiErrorPayload<TCode, TFieldCode>,
    options?: { cause?: unknown; retryAfterSeconds?: number },
  ) {
    super(payload.message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = "ApiError";
    this.status = status;
    this.code = payload.code;
    this.params = payload.params;
    this.fields = payload.fields ?? [];
    this.details = payload.details;
    this.requestId = payload.request_id;
    this.retryAfterSeconds = options?.retryAfterSeconds;
  }

  withMessage(message: string): ApiError<TCode, TFieldCode> {
    return new ApiError<TCode, TFieldCode>(
      this.status,
      {
        code: this.code,
        message,
        ...(this.params ? { params: this.params } : {}),
        ...(this.fields.length ? { fields: this.fields } : {}),
        ...(this.details ? { details: this.details } : {}),
        ...(this.requestId ? { request_id: this.requestId } : {}),
      },
      {
        ...(this.cause === undefined ? {} : { cause: this.cause }),
        ...(this.retryAfterSeconds === undefined
          ? {}
          : { retryAfterSeconds: this.retryAfterSeconds }),
      },
    );
  }
}

export function isApiError(value: unknown): value is ApiError {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ApiError>;
  return (
    candidate.name === "ApiError" &&
    typeof candidate.status === "number" &&
    typeof candidate.code === "string" &&
    typeof candidate.message === "string" &&
    Array.isArray(candidate.fields)
  );
}

export function isAbortError(value: unknown): boolean {
  return (
    (value !== null &&
      typeof value === "object" &&
      "name" in value &&
      value.name === "AbortError") ||
    (isApiError(value) && value.code === CORE_ERROR_CODES.aborted)
  );
}
