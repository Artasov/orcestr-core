export type RequestOriginLike = {
  headers: {
    get(name: string): string | null;
  };
  nextUrl: {
    origin: string;
  };
};

export type RequestOriginOptions = {
  trustProxy?: boolean;
  allowedHosts?: readonly string[];
  fallbackOrigin?: string;
};

export function requestProtocol(
  request: RequestOriginLike,
  options: RequestOriginOptions = {},
): "http" | "https" {
  if (options.trustProxy) {
    const forwarded = firstForwardedValue(
      request.headers.get("x-forwarded-proto"),
    )?.toLowerCase();
    if (forwarded === "http" || forwarded === "https") return forwarded;
  }
  return new URL(request.nextUrl.origin).protocol === "http:" ? "http" : "https";
}

export function requestHost(
  request: RequestOriginLike,
  options: RequestOriginOptions = {},
): string {
  if (options.trustProxy) {
    const forwarded = firstForwardedValue(
      request.headers.get("x-forwarded-host"),
    );
    if (forwarded && validHost(forwarded)) return forwarded.toLowerCase();
  }
  return new URL(request.nextUrl.origin).host.toLowerCase();
}

export function requestOrigin(
  request: RequestOriginLike,
  options: RequestOriginOptions = {},
): string {
  const candidate = new URL(
    `${requestProtocol(request, options)}://${requestHost(request, options)}`,
  ).origin;
  if (hostAllowed(new URL(candidate).host, options.allowedHosts)) {
    return candidate;
  }
  if (options.fallbackOrigin) {
    const fallback = normalizedHttpOrigin(options.fallbackOrigin);
    if (hostAllowed(new URL(fallback).host, options.allowedHosts)) {
      return fallback;
    }
  }
  throw new TypeError("The request host is not allowed.");
}

function firstForwardedValue(value: string | null): string | null {
  const first = value?.split(",", 1)[0]?.trim();
  return first || null;
}

function validHost(value: string): boolean {
  if (
    value.length > 255 ||
    /[\s\\/@?#\u0000-\u001f\u007f]/.test(value)
  ) {
    return false;
  }
  try {
    const parsed = new URL(`http://${value}`);
    return (
      parsed.username === "" &&
      parsed.password === "" &&
      parsed.pathname === "/" &&
      parsed.search === "" &&
      parsed.hash === "" &&
      parsed.host.toLowerCase() === value.toLowerCase()
    );
  } catch {
    return false;
  }
}

function hostAllowed(
  host: string,
  allowedHosts: readonly string[] | undefined,
): boolean {
  if (!allowedHosts) return true;
  const normalized = host.toLowerCase();
  return allowedHosts.some((allowed) => allowed.toLowerCase() === normalized);
}

function normalizedHttpOrigin(value: string): string {
  const parsed = new URL(value);
  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new TypeError("fallbackOrigin must be an HTTP(S) origin.");
  }
  return parsed.origin;
}
