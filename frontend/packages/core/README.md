<p align="right">
  <strong>English</strong> · <a href="./README.ru.md">Русский</a>
</p>

# @orcestr/core

Framework-independent API transport, error parsing, field-path, localization and safe-navigation
primitives for Orcestr applications.

The package uses the platform `fetch`, `Headers`, `Response`, `AbortController` and `URL` APIs. It
does not depend on React, Next.js or `@orcestr/ui`.

## Install

```bash
npm install @orcestr/core
```

## API client

```ts
import { ApiClient } from "@orcestr/core";

const api = new ApiClient({
  baseUrl: "https://example.com/api/",
  defaultHeaders: () => ({ "X-Requested-With": "XMLHttpRequest" }),
  onError: ({ method, url, status, durationMs }) => {
    console.warn(`${method} ${url} failed with ${status ?? "network"} in ${durationMs}ms`);
  },
});

const order = await api.request<{ id: number }>("orders/42/", {
  timeoutMs: 10_000,
});

const { data, response } = await api.requestWithResponse<Blob>("orders/42/pdf/", {
  responseType: "blob",
});
```

`responseType` supports `json` (default), `text`, `blob` and the raw `response`. HTTP failures are
parsed into `ApiError`. Invalid success JSON, invalid error envelopes, timeouts, cancellation and
network failures receive stable core error codes.

The client deliberately does not implement cookies, authentication refresh or retry policy.
[Orcestr Auth](https://github.com/Artasov/orcestr-auth) is the reference authentication layer: its
`@orcestr/auth-core` package supplies a custom `execute` function with cookie credentials and
one refresh/retry cycle.

## Error catalogs

```ts
import {
  isApiError,
  resolveApiErrorMessage,
  type ErrorCatalog,
} from "@orcestr/core";

const catalog = {
  order_already_closed: (params) => `Order ${params.order_id ?? ""} is already closed.`,
  forbidden: "You do not have access to this order.",
} satisfies ErrorCatalog;

try {
  await api.request("orders/42/close/", { method: "POST" });
} catch (error) {
  if (!isApiError(error)) throw error;
  const message = resolveApiErrorMessage(error, catalog, "Unable to complete the request.");
  console.log(error.status, error.code, error.requestId, message);
}
```

Use `code` for behavior and localization. Treat the server `message` as diagnostic fallback text;
never branch business logic on it.

## Field errors

```ts
import { fieldPathToFormName, firstFieldError, groupFieldErrors } from "@orcestr/core";

if (isApiError(error)) {
  const quantity = firstFieldError(error.fields, ["items", 0, "quantity"]);
  const inputName = fieldPathToFormName(quantity?.path ?? []); // items[0].quantity
  const byJsonPointer = groupFieldErrors(error.fields);       // /items/0/quantity
}
```

Paths are arrays of strings and integers. This avoids ambiguous dotted backend strings and lets
each form adapter choose its own naming convention.

## Safe internal navigation

```ts
import { safeInternalPath } from "@orcestr/core";

const next = safeInternalPath(searchParams.get("next"), "/overview");
```

`safeInternalPath` rejects absolute/protocol-relative URLs, backslashes, control characters,
unsafe decoded paths and values longer than 2048 characters.

## Public API groups

| Area | Main exports |
| --- | --- |
| Transport | `ApiClient`, `ApiRequestOptions`, `ApiResult` |
| Errors | `ApiError`, `isApiError`, `CORE_ERROR_CODES`, `parseApiError` |
| Contract | `ApiErrorEnvelope`, `ApiErrorPayload`, `ApiFieldError`, JSON types |
| Localization | `ErrorCatalog`, `resolveApiErrorMessage`, `interpolateErrorMessage` |
| Forms | `fieldPathToPointer`, `fieldPathToFormName`, `groupFieldErrors`, `firstFieldError` |
| Navigation | `safeInternalPath` |

The parser accepts only the documented `{ "error": { ... } }` envelope and rejects unknown
keys. See the repository [error contract](../../../docs/error-contract.md) for the complete schema.
