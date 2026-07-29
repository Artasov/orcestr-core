import { ApiError, CORE_ERROR_CODES } from "./errors.js";
import type {
  ApiErrorPayload,
  ApiFieldError,
  ErrorParams,
  FieldPathPart,
  JsonObject,
  JsonPrimitive,
  JsonValue,
} from "./types.js";

const ERROR_CODE = /^[a-z][a-z0-9_]*$/u;
const ENVELOPE_KEYS = new Set(["error"]);
const ERROR_KEYS = new Set([
  "code",
  "message",
  "params",
  "fields",
  "details",
  "request_id",
]);
const FIELD_ERROR_KEYS = new Set(["path", "code", "message", "params"]);

export function parseApiError(
  status: number,
  raw: unknown,
  headers?: Headers,
): ApiError {
  const payload = parseApiErrorPayload(raw);
  if (!payload) {
    return new ApiError(
      status,
      {
        code: CORE_ERROR_CODES.invalidResponse,
        message: "The server returned an invalid error response.",
      },
      {
        retryAfterSeconds: parseRetryAfter(headers?.get("retry-after")),
      },
    );
  }
  return new ApiError(status, payload, {
    retryAfterSeconds: parseRetryAfter(headers?.get("retry-after")),
  });
}

export function parseApiErrorPayload(
  raw: unknown,
): ApiErrorPayload | undefined {
  if (
    !isRecord(raw) ||
    !hasOnlyKeys(raw, ENVELOPE_KEYS) ||
    !isRecord(raw.error) ||
    !hasOnlyKeys(raw.error, ERROR_KEYS)
  ) {
    return undefined;
  }
  const error = raw.error;
  if (!isCode(error.code) || !isNonEmptyString(error.message)) return undefined;

  const params =
    error.params === undefined ? undefined : parseParams(error.params);
  if (error.params !== undefined && !params) return undefined;

  const fields =
    error.fields === undefined ? undefined : parseFields(error.fields);
  if (error.fields !== undefined && !fields) return undefined;

  const details =
    error.details === undefined ? undefined : parseJsonObject(error.details);
  if (error.details !== undefined && !details) return undefined;

  if (
    error.request_id !== undefined &&
    !isNonEmptyString(error.request_id)
  ) {
    return undefined;
  }

  return {
    code: error.code,
    message: error.message,
    ...(params ? { params } : {}),
    ...(fields ? { fields } : {}),
    ...(details ? { details } : {}),
    ...(error.request_id ? { request_id: error.request_id } : {}),
  };
}

function parseFields(value: unknown): readonly ApiFieldError[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const fields: ApiFieldError[] = [];
  for (const item of value) {
    if (
      !isRecord(item) ||
      !hasOnlyKeys(item, FIELD_ERROR_KEYS) ||
      !Array.isArray(item.path) ||
      !isCode(item.code)
    ) {
      return undefined;
    }
    if (!item.path.every(isFieldPathPart)) return undefined;
    if (item.message !== undefined && !isNonEmptyString(item.message)) {
      return undefined;
    }
    const params =
      item.params === undefined ? undefined : parseParams(item.params);
    if (item.params !== undefined && !params) return undefined;
    fields.push({
      path: item.path,
      code: item.code,
      ...(item.message ? { message: item.message } : {}),
      ...(params ? { params } : {}),
    });
  }
  return fields;
}

function parseParams(value: unknown): ErrorParams | undefined {
  if (!isRecord(value)) return undefined;
  const entries = Object.entries(value);
  if (!entries.every(([, item]) => isJsonPrimitive(item))) return undefined;
  return Object.fromEntries(entries) as Record<string, JsonPrimitive>;
}

function parseJsonObject(value: unknown): JsonObject | undefined {
  if (!isRecord(value)) return undefined;
  if (!Object.values(value).every(isJsonValue)) return undefined;
  return value as JsonObject;
}

function isJsonValue(value: unknown): value is JsonValue {
  if (isJsonPrimitive(value)) return true;
  if (Array.isArray(value)) return value.every(isJsonValue);
  return isRecord(value) && Object.values(value).every(isJsonValue);
}

function isJsonPrimitive(value: unknown): value is JsonPrimitive {
  return (
    value === null ||
    typeof value === "string" ||
    (typeof value === "number" && Number.isFinite(value)) ||
    typeof value === "boolean"
  );
}

function isFieldPathPart(value: unknown): value is FieldPathPart {
  return (
    typeof value === "string" ||
    (typeof value === "number" && Number.isInteger(value))
  );
}

function isCode(value: unknown): value is string {
  return typeof value === "string" && ERROR_CODE.test(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
): boolean {
  return Object.keys(value).every((key) => allowed.has(key));
}

function parseRetryAfter(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds;
  const date = Date.parse(value);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, Math.ceil((date - Date.now()) / 1000));
}
