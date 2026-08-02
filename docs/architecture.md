<p align="right">
  <strong>English</strong> · <a href="./architecture.ru.md">Русский</a>
</p>

# Architecture

Orcestr Core is split by runtime and framework boundary:

- [`@orcestr/core`](../frontend/packages/core/README.md) contains framework-independent transport, error parsing,
  field-path, catalog, and safe-navigation primitives.
- [`@orcestr/core-react`](../frontend/packages/core-react/README.md) adapts error presentation to React and TanStack Query.
  It does not render UI and depends on a notification callback supplied by the
  application.
- [`@orcestr/core-next`](../frontend/packages/core-next/README.md) contains the small Next.js-specific request and redirect
  boundary.
- [`orcestr-core`](../backend/README.md) contains the Python models and exception type. Its optional
  `fastapi` extra adds exception handlers and request-id middleware.

Dependency direction is always framework adapter → core. Product domains and
[Orcestr Auth](https://github.com/Artasov/orcestr-auth) packages may depend on
Core, while Core never imports them. Rendered feedback can use
[Orcestr UI](https://github.com/Artasov/orcestr-ui), but Core React accepts a
callback and does not import the UI library.

## Ownership in a consuming application

“Product/domain code” means the business layer of the application using Core;
it is not the name of another required package. That layer defines codes such
as `order_already_closed`, their translations and whether an operation can be
retried. [Orcestr Auth](https://github.com/Artasov/orcestr-auth) is a concrete
domain package for authentication and defines codes such as
`invalid_credentials`. [Orcestr UI](https://github.com/Artasov/orcestr-ui) can
render the resolved message as an alert, field error or toast.

Core owns the wire format, strict parsing, transport behavior and extension
points. This direction keeps Core usable outside Orcestr products and prevents
an API contract package from depending on authentication or visual design.
