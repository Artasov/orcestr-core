# @orcestr/core

Framework-independent API error, transport, field-path, localization, and safe
navigation primitives for Orcestr applications.

```ts
import { ApiClient, isApiError, resolveApiErrorMessage } from "@orcestr/core";

const api = new ApiClient({
  baseUrl: "https://example.com/api/",
  defaultHeaders: { "X-Requested-With": "XMLHttpRequest" },
});

try {
  await api.request("orders/1");
} catch (error) {
  if (isApiError(error)) {
    const message = resolveApiErrorMessage(error, errorCatalog, fallback);
    // Present `message`; keep the server diagnostic out of the UI.
  }
}
```

The parser accepts only the documented `{error: {...}}` envelope. Authentication
refresh, cookies, React, Next.js, UI components, and product error catalogs are
deliberately outside this package.
