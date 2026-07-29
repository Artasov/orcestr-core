const MAX_INTERNAL_PATH_LENGTH = 2048;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/u;

export function safeInternalPath(
  value: string | null | undefined,
  fallback = "/",
): string {
  return normalizeInternalPath(value) ?? normalizeInternalPath(fallback) ?? "/";
}

function normalizeInternalPath(
  value: string | null | undefined,
): string | null {
  if (
    !value ||
    value.length > MAX_INTERNAL_PATH_LENGTH ||
    CONTROL_CHARACTERS.test(value) ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return null;
  }

  try {
    const parsed = new URL(value, "http://orcestr.internal");
    if (
      parsed.origin !== "http://orcestr.internal" ||
      hasUnsafeDecodedPath(parsed.pathname)
    ) {
      return null;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

function hasUnsafeDecodedPath(pathname: string): boolean {
  let decoded = pathname;
  for (let depth = 0; depth < 5; depth += 1) {
    let next: string;
    try {
      next = decodeURIComponent(decoded);
    } catch {
      return true;
    }
    if (
      CONTROL_CHARACTERS.test(next) ||
      next.includes("\\") ||
      next.startsWith("//")
    ) {
      return true;
    }
    if (next === decoded) return false;
    decoded = next;
  }
  return true;
}
