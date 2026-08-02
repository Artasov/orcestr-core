<p align="right">
  <strong>English</strong> · <a href="./README.ru.md">Русский</a>
</p>

# Orcestr Core

Shared, domain-neutral API contracts and framework adapters for Orcestr applications.

Orcestr Core keeps the same error envelope, field paths, request IDs and safe redirects across
Python, TypeScript, React and Next.js. It complements
[Orcestr Auth](https://github.com/Artasov/orcestr-auth), which owns reusable authentication
mechanics, and [Orcestr UI](https://github.com/Artasov/orcestr-ui), which owns rendered
components and design tokens. Product-specific rules and error codes remain in the consuming
application.

## Packages

| Package | Runtime | Purpose |
| --- | --- | --- |
| [`orcestr-core`](./backend/README.md) | Python 3.12+ | Error models, request context and optional FastAPI adapters |
| [`@orcestr/core`](./frontend/packages/core/README.md) | Browser or server JavaScript | Fetch transport, strict error parsing, catalogs, field paths and safe internal paths |
| [`@orcestr/core-react`](./frontend/packages/core-react/README.md) | React 18/19 | Localized error presentation and TanStack Query notification adapters |
| [`@orcestr/core-next`](./frontend/packages/core-next/README.md) | Next.js 15/16 | Request-origin validation and safe redirects |

The packages are independently installable but share one contract:

```json
{
  "error": {
    "code": "order_already_closed",
    "message": "The order is already closed.",
    "params": { "order_id": 42 },
    "fields": [
      { "path": ["items", 0, "quantity"], "code": "greater_than", "params": { "gt": 0 } }
    ],
    "request_id": "01J..."
  }
}
```

Error codes use lowercase `snake_case`. The consuming application's domain layer owns its codes
and localized catalogs; for example, Orcestr Auth owns authentication codes such as
`invalid_credentials`. `message` is a safe diagnostic fallback, not the primary localized UI
copy. See [Architecture](./docs/architecture.md) for a concrete ownership map.

## Install

```bash
pip install "orcestr-core[fastapi]"
npm install @orcestr/core @orcestr/core-react @orcestr/core-next
```

Install only the framework adapters used by the application. React, TanStack Query, Next.js and
FastAPI remain optional peer/extra dependencies.

## End-to-end wiring

Backend:

```python
from fastapi import FastAPI
from orcestr_core import ApiError
from orcestr_core.fastapi import RequestIdMiddleware, register_api_error_handlers

app = FastAPI()
app.add_middleware(RequestIdMiddleware)
register_api_error_handlers(app)

raise ApiError(
    status_code=409,
    code="order_already_closed",
    message="The order is already closed.",
    params={"order_id": 42},
)
```

Frontend:

```ts
import {
  ApiClient,
  isApiError,
  resolveApiErrorMessage,
  type ErrorCatalog,
} from "@orcestr/core";

const api = new ApiClient({ baseUrl: "/api/" });
const catalog = {
  order_already_closed: (params) =>
    `Order ${params.order_id ?? ""} is already closed.`,
} satisfies ErrorCatalog;

try {
  await api.request("orders/42/close/", { method: "POST", timeoutMs: 10_000 });
} catch (error) {
  if (isApiError(error)) {
    console.log(resolveApiErrorMessage(error, catalog, "Unable to close the order."));
  }
}
```

See each package README for FastAPI validation fields, React Query integration and trusted-proxy
rules for Next.js redirects.

## Design boundaries

| Owner | Responsibility | Where to start |
| --- | --- | --- |
| Orcestr Core (this repository) | Error envelope, strict parser, HTTP transport, field paths, request IDs and framework adapters | [Package overview](#packages) and [architecture](./docs/architecture.md) |
| [Orcestr Auth](https://github.com/Artasov/orcestr-auth) | Login/session/OAuth mechanics, auth-specific error codes, refresh policy and auth routes | [Orcestr Auth README](https://github.com/Artasov/orcestr-auth#readme) |
| Product/domain code in the consuming application | Business error codes, translations, retry decisions and product rules; this is application code, not another Core package | [Ownership explanation](./docs/architecture.md#ownership-in-a-consuming-application) |
| [Orcestr UI](https://github.com/Artasov/orcestr-ui) or another UI layer | Dialogs, alerts, toasts and visual design; Core React only emits presentation data and callbacks | [Orcestr UI consumer guide](https://github.com/Artasov/orcestr-ui/blob/main/docs/CONSUMER_GUIDE.md) |

Consumers must not branch product behavior on human-readable `message` values.

## Documentation

- [Architecture](./docs/architecture.md)
- [Error contract](./docs/error-contract.md)
- [Backend package](./backend/README.md)
- [`@orcestr/core`](./frontend/packages/core/README.md)
- [`@orcestr/core-react`](./frontend/packages/core-react/README.md)
- [`@orcestr/core-next`](./frontend/packages/core-next/README.md)
- [Contributing](./CONTRIBUTING.md)

## Development

```powershell
cd backend
uv sync --frozen
uv run pytest

cd ..\frontend
npm ci
npm run typecheck
npm test
npm run pack:dry-run
```

## License

Licensed under the [Mozilla Public License 2.0](./LICENSE). See [NOTICE](./NOTICE) and
[TRADEMARKS.md](./TRADEMARKS.md).
