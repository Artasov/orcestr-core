# Architecture

Orcestr Core is split by runtime and framework boundary:

- `@orcestr/core` contains framework-independent transport, error parsing,
  field-path, catalog, and safe-navigation primitives.
- `@orcestr/core-react` adapts error presentation to React and TanStack Query.
  It does not render UI and depends on a notification callback supplied by the
  application.
- `@orcestr/core-next` contains the small Next.js-specific request and redirect
  boundary.
- `orcestr-core` contains the Python models and exception type. Its optional
  `fastapi` extra adds exception handlers and request-id middleware.

Dependency direction is always framework adapter → core. Product domains and
authentication packages may depend on core, while core never imports them.

Domain packages own stable error codes and translations. Core owns the
wire-format, strict parsing, transport behavior, and extension points.

