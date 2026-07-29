"use client";

import {
  firstFieldError,
  groupFieldErrors,
  isApiError,
  resolveApiErrorMessage,
  resolveErrorCodeMessage,
  type ApiFieldError,
  type ErrorCatalog,
  type FieldPathPart,
} from "@orcestr/core";
import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

type ErrorMessagesContextValue = {
  catalog: ErrorCatalog;
  fallback: string;
};

const ErrorMessagesContext = createContext<ErrorMessagesContextValue>({
  catalog: {},
  fallback: "Unable to complete the request.",
});

export function ErrorMessagesProvider({
  catalog,
  fallback,
  children,
}: {
  catalog: ErrorCatalog;
  fallback: string;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ catalog, fallback }),
    [catalog, fallback],
  );
  return (
    <ErrorMessagesContext.Provider value={value}>
      {children}
    </ErrorMessagesContext.Provider>
  );
}

export function useErrorMessage(
  error: unknown,
  fallbackOverride?: string,
): string {
  const { catalog, fallback } = useContext(ErrorMessagesContext);
  return resolveApiErrorMessage(error, catalog, fallbackOverride ?? fallback);
}

export function useApiFieldErrors(
  error: unknown,
): ReadonlyMap<string, readonly ApiFieldError[]> {
  return useMemo(
    () => groupFieldErrors(isApiError(error) ? error.fields : []),
    [error],
  );
}

export function useFieldErrorMessage(
  field: ApiFieldError | undefined,
  fallbackOverride?: string,
): string | undefined {
  const { catalog, fallback } = useContext(ErrorMessagesContext);
  if (!field) return undefined;
  return resolveErrorCodeMessage(
    field,
    catalog,
    fallbackOverride ?? fallback,
  );
}

export function useFirstApiFieldError(
  error: unknown,
  path: readonly FieldPathPart[],
): ApiFieldError | undefined {
  return useMemo(
    () => firstFieldError(isApiError(error) ? error.fields : [], path),
    [error, path],
  );
}
