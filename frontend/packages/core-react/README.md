<p align="right">
  <strong>English</strong> · <a href="./README.ru.md">Русский</a>
</p>

# @orcestr/core-react

Headless React and TanStack Query adapters for
[`@orcestr/core`](../core/README.md) errors. The package renders no UI and does
not depend on [Orcestr UI](https://github.com/Artasov/orcestr-ui).

## Install

```bash
npm install @orcestr/core @orcestr/core-react @tanstack/react-query react
```

## Localized error messages

Provide the active product catalog and fallback near the application root:

```tsx
import type { ReactNode } from "react";
import { ErrorMessagesProvider, useErrorMessage } from "@orcestr/core-react";

const catalog = {
  order_already_closed: "This order is already closed.",
  minimum_quantity: (params) => `Enter at least ${params.minimum ?? 1}.`,
};

function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorMessagesProvider catalog={catalog} fallback="Unable to complete the request.">
      {children}
    </ErrorMessagesProvider>
  );
}

function FormError({ error }: { error: unknown }) {
  return <p role="alert">{useErrorMessage(error)}</p>;
}
```

Re-render the provider with a different catalog and fallback when the application locale changes.
The consuming application's product/domain layer supplies its business codes.
[Orcestr Auth](https://github.com/Artasov/orcestr-auth) supplies authentication codes such as
`invalid_credentials`. See the
[ownership map](../../../docs/architecture.md#ownership-in-a-consuming-application).

## Form field errors

```tsx
import { useFieldErrorMessage, useFirstApiFieldError } from "@orcestr/core-react";

const fieldError = useFirstApiFieldError(error, ["items", 0, "quantity"]);
const message = useFieldErrorMessage(fieldError, "Invalid quantity.");
```

Use `useApiFieldErrors(error)` when a form adapter needs all fields grouped by JSON Pointer.

## Global notifications with TanStack Query

Create one controller and connect it to the query and mutation caches:

```tsx
import type { ReactNode } from "react";
import {
  ErrorNotificationController,
  ErrorNotificationProvider,
  createMutationErrorHandler,
  createQueryErrorHandler,
} from "@orcestr/core-react";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";

const controller = new ErrorNotificationController({
  resolve: (error) => ({ title: "Request failed", message: String(error) }),
  notify: ({ title, message }) => console.error(`${title}: ${message}`),
});

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: createQueryErrorHandler(controller) }),
  mutationCache: new MutationCache({ onError: createMutationErrorHandler(controller) }),
});

function QueryProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorNotificationProvider controller={controller}>{children}</ErrorNotificationProvider>
    </QueryClientProvider>
  );
}
```

Replace `console.error` with the application's toast or notification adapter.

`ErrorNotificationController` records handled error objects and prevents duplicate global
notifications. A mutation with its own `onError` is considered locally handled. Call
`controller.configure(...)` when locale-dependent resolver or notification callbacks change.

## Public API

| Area | Exports |
| --- | --- |
| Message context | `ErrorMessagesProvider`, `useErrorMessage` |
| Field messages | `useApiFieldErrors`, `useFirstApiFieldError`, `useFieldErrorMessage` |
| Notifications | `ErrorNotificationController`, `ErrorNotificationProvider`, `useErrorNotifications` |
| TanStack Query | `createQueryErrorHandler`, `createMutationErrorHandler` |

UI rendering, toast components and router behavior remain consumer-owned. A consumer can connect
the notification callback to [Orcestr UI](https://github.com/Artasov/orcestr-ui) `useToast()` or
to another UI system.
