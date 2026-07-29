import { safeInternalPath } from "@orcestr/core";
import { NextResponse, type NextRequest } from "next/server.js";

import {
  requestOrigin,
  type RequestOriginOptions,
} from "./origin.js";

export * from "./origin.js";

export function requestInternalPath(
  request: NextRequest,
  fallback = "/",
): string {
  return safeInternalPath(
    `${request.nextUrl.pathname}${request.nextUrl.search}${request.nextUrl.hash}`,
    fallback,
  );
}

export function internalRedirect(
  request: NextRequest,
  target: string,
  fallback = "/",
  originOptions: RequestOriginOptions = {},
): NextResponse {
  const safeTarget = safeInternalPath(target, fallback);
  const parsed = new URL(safeTarget, requestOrigin(request, originOptions));
  return NextResponse.redirect(parsed);
}
