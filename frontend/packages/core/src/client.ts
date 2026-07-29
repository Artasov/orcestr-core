import {
  ApiError,
  CORE_ERROR_CODES,
  isAbortError,
  isApiError,
} from "./errors.js";
import { parseApiError } from "./parser.js";

export type ApiResponseType = "json" | "text" | "blob" | "response";

export type ApiRequestOptions = Omit<RequestInit, "signal"> & {
  signal?: AbortSignal;
  timeoutMs?: number;
  responseType?: ApiResponseType;
};

export type ApiExecutor = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type ApiClientEvent = {
  method: string;
  url: string;
  durationMs: number;
  status?: number;
  error?: unknown;
};

export type ApiClientOptions = {
  baseUrl?: string;
  execute?: ApiExecutor;
  defaultHeaders?: HeadersInit | (() => HeadersInit);
  onRequest?: (event: Omit<ApiClientEvent, "durationMs">) => void;
  onResponse?: (event: ApiClientEvent) => void;
  onError?: (event: ApiClientEvent) => void;
};

export type ApiResult<T> = {
  data: T;
  response: Response;
};

export class ApiClient {
  readonly baseUrl: string;
  private readonly execute: ApiExecutor;
  private readonly defaultHeaders?: HeadersInit | (() => HeadersInit);
  private readonly onRequest?: ApiClientOptions["onRequest"];
  private readonly onResponse?: ApiClientOptions["onResponse"];
  private readonly onError?: ApiClientOptions["onError"];

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? "";
    this.execute = options.execute ?? globalThis.fetch.bind(globalThis);
    this.defaultHeaders = options.defaultHeaders;
    this.onRequest = options.onRequest;
    this.onResponse = options.onResponse;
    this.onError = options.onError;
  }

  async request<T = unknown>(
    path: string,
    options: ApiRequestOptions = {},
  ): Promise<T> {
    const result = await this.requestWithResponse<T>(path, options);
    return result.data;
  }

  async requestWithResponse<T = unknown>(
    path: string,
    options: ApiRequestOptions = {},
  ): Promise<ApiResult<T>> {
    const url = this.resolveUrl(path);
    const method = options.method ?? "GET";
    const startedAt = now();
    const { signal, cleanup, timedOut } = combinedSignal(
      options.signal,
      options.timeoutMs,
    );
    const headers = new Headers(
      typeof this.defaultHeaders === "function"
        ? this.defaultHeaders()
        : this.defaultHeaders,
    );
    new Headers(options.headers).forEach((value, key) => headers.set(key, value));
    const init: RequestInit = { ...options, method, headers, signal };
    delete (init as Partial<ApiRequestOptions>).timeoutMs;
    delete (init as Partial<ApiRequestOptions>).responseType;
    this.onRequest?.({ method, url });

    try {
      const response = await this.execute(url, init);
      const durationMs = now() - startedAt;
      if (!response.ok) {
        const raw = await readErrorBody(response);
        const error = parseApiError(response.status, raw, response.headers);
        this.onError?.({
          method,
          url,
          durationMs,
          status: response.status,
          error,
        });
        throw error;
      }
      let data: T;
      try {
        data = (await readSuccessBody(
          response,
          options.responseType ?? "json",
        )) as T;
      } catch (cause) {
        const error = new ApiError(
          response.status,
          {
            code: CORE_ERROR_CODES.invalidResponse,
            message: "The server returned an invalid success response.",
          },
          { cause },
        );
        this.onError?.({
          method,
          url,
          durationMs: now() - startedAt,
          status: response.status,
          error,
        });
        throw error;
      }
      this.onResponse?.({
        method,
        url,
        durationMs: now() - startedAt,
        status: response.status,
      });
      return { data, response };
    } catch (cause) {
      if (isApiError(cause)) throw cause;
      const code = timedOut()
        ? CORE_ERROR_CODES.timeout
        : isAbortError(cause)
          ? CORE_ERROR_CODES.aborted
          : CORE_ERROR_CODES.network;
      const message = {
        [CORE_ERROR_CODES.timeout]: "The request timed out.",
        [CORE_ERROR_CODES.aborted]: "The request was cancelled.",
        [CORE_ERROR_CODES.network]: "The network request failed.",
      }[code];
      const error = new ApiError(0, { code, message }, { cause });
      this.onError?.({
        method,
        url,
        durationMs: now() - startedAt,
        error,
      });
      throw error;
    } finally {
      cleanup();
    }
  }

  private resolveUrl(path: string): string {
    if (!this.baseUrl) return path;
    return new URL(path, this.baseUrl).toString();
  }
}

async function readErrorBody(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => "");
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

async function readSuccessBody(
  response: Response,
  responseType: ApiResponseType,
): Promise<unknown> {
  if (responseType === "response") return response;
  if (response.status === 204 || response.status === 205) return undefined;
  if (responseType === "blob") return response.blob();
  if (responseType === "text") return response.text();
  const text = await response.text();
  return text ? (JSON.parse(text) as unknown) : undefined;
}

function combinedSignal(
  external: AbortSignal | undefined,
  timeoutMs: number | undefined,
): {
  signal: AbortSignal | undefined;
  cleanup: () => void;
  timedOut: () => boolean;
} {
  if (timeoutMs === undefined) {
    return { signal: external, cleanup: () => undefined, timedOut: () => false };
  }
  const controller = new AbortController();
  let timeoutTriggered = false;
  const onAbort = () => controller.abort(external?.reason);
  external?.addEventListener("abort", onAbort, { once: true });
  if (external?.aborted) onAbort();
  const timer = setTimeout(() => {
    timeoutTriggered = true;
    controller.abort(new DOMException("Request timed out.", "TimeoutError"));
  }, timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      external?.removeEventListener("abort", onAbort);
    },
    timedOut: () => timeoutTriggered,
  };
}

function now(): number {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}
