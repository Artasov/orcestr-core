import { isApiError, type ApiError } from "./errors.js";
import type { ErrorParams, JsonPrimitive } from "./types.js";

export type ErrorMessageFactory = (params: ErrorParams) => string;
export type ErrorMessage = string | ErrorMessageFactory;
export type ErrorCatalog<TCode extends string = string> = Readonly<
  Partial<Record<TCode, ErrorMessage>>
>;

export function resolveApiErrorMessage(
  error: unknown,
  catalog: ErrorCatalog,
  fallback: string,
): string {
  if (!isApiError(error)) return fallback;
  return resolveErrorCodeMessage(error, catalog, fallback);
}

export function resolveErrorCodeMessage(
  error: Pick<ApiError, "code" | "params">,
  catalog: ErrorCatalog,
  fallback: string,
): string {
  const entry = catalog[error.code];
  if (typeof entry === "function") return entry(error.params ?? {});
  if (typeof entry === "string") {
    return interpolateErrorMessage(entry, error.params ?? {});
  }
  return fallback;
}

export function interpolateErrorMessage(
  template: string,
  params: Readonly<Record<string, JsonPrimitive>>,
): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/gu, (match, key: string) => {
    if (!(key in params)) return match;
    const value = params[key];
    return value === null ? "" : String(value);
  });
}

