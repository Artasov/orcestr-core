# Orcestr Core

Shared, domain-neutral contracts and framework adapters for Orcestr applications.

The repository publishes:

- `@orcestr/core` — API errors, transport primitives, error catalogs and safe internal paths;
- `@orcestr/core-react` — React error presentation and React Query integration;
- `@orcestr/core-next` — Next.js request and redirect helpers;
- `orcestr-core` — Python errors, schemas, request context and FastAPI adapters.

Domain packages own their error codes. Core owns only the envelope and the mechanics
used to transport and present those errors.

See [the architecture](docs/architecture.md), [the error
contract](docs/error-contract.md), and [the contribution guide](CONTRIBUTING.md).
