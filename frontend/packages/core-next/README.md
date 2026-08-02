<p align="right">
  <strong>English</strong> · <a href="./README.ru.md">Русский</a>
</p>

# @orcestr/core-next

Small Next.js adapters for the framework-independent `@orcestr/core` package.

## Install

```bash
npm install @orcestr/core @orcestr/core-next next
```

## Safe request paths and redirects

```ts
import { internalRedirect, requestInternalPath } from "@orcestr/core-next";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const currentPath = requestInternalPath(request, "/");
  const login = `/login?next=${encodeURIComponent(currentPath)}`;

  return internalRedirect(request, login, "/login", {
    trustProxy: true,
    allowedHosts: ["app.example.com"],
    fallbackOrigin: "https://app.example.com",
  });
}
```

`requestInternalPath` keeps only the request pathname, search and hash and passes the result
through `safeInternalPath`.

`internalRedirect` validates the target as an internal path, resolves the trusted request origin
and returns `NextResponse.redirect(...)`.

## Trusted proxy configuration

```ts
import { requestHost, requestOrigin, requestProtocol } from "@orcestr/core-next";

const options = {
  trustProxy: true,
  allowedHosts: ["app.example.com", "admin.example.com"],
  fallbackOrigin: "https://app.example.com",
};

const protocol = requestProtocol(request, options);
const host = requestHost(request, options);
const origin = requestOrigin(request, options);
```

- Forwarded host and protocol headers are ignored unless `trustProxy` is explicitly enabled.
- `allowedHosts` compares exact host values, including a port when present.
- `requestOrigin` throws when neither the request host nor `fallbackOrigin` is allowed.
- Production deployments behind a trusted reverse proxy should provide both `trustProxy: true`
  and an explicit `allowedHosts` list.

This package does not know auth cookies, login routes or protected-route policy. The reference
integration is
[`@orcestr/auth-next`](https://github.com/Artasov/orcestr-auth/tree/main/frontend/packages/next),
while product-specific protected-route policy remains in the application.

## Public API

| Export | Purpose |
| --- | --- |
| `requestInternalPath` | Current safe internal URL path |
| `internalRedirect` | Safe redirect using a validated request origin |
| `requestProtocol` | Direct or trusted forwarded HTTP protocol |
| `requestHost` | Direct or trusted forwarded host |
| `requestOrigin` | Validated HTTP(S) origin |
| `RequestOriginOptions` | `trustProxy`, `allowedHosts` and `fallbackOrigin` options |
