<p align="right">
  <a href="./README.md">English</a> · <strong>Русский</strong>
</p>

# @orcestr/core-react

Headless React- и TanStack Query-адаптеры ошибок
[`@orcestr/core`](../core/README.ru.md). Пакет не рисует UI и не зависит от
[Orcestr UI](https://github.com/Artasov/orcestr-ui).

## Установка

```bash
npm install @orcestr/core @orcestr/core-react @tanstack/react-query react
```

## Локализованные сообщения

Передайте активный продуктовый каталог и fallback рядом с корнем приложения:

```tsx
import type { ReactNode } from "react";
import { ErrorMessagesProvider, useErrorMessage } from "@orcestr/core-react";

const catalog = {
  order_already_closed: "Этот заказ уже закрыт.",
  minimum_quantity: (params) => `Введите не меньше ${params.minimum ?? 1}.`,
};

function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorMessagesProvider catalog={catalog} fallback="Не удалось выполнить запрос.">
      {children}
    </ErrorMessagesProvider>
  );
}

function FormError({ error }: { error: unknown }) {
  return <p role="alert">{useErrorMessage(error)}</p>;
}
```

При смене локали перерендерите provider с новым catalog и fallback. Product/domain-слой
consumer-приложения передаёт свои бизнес-коды.
[Orcestr Auth](https://github.com/Artasov/orcestr-auth) передаёт auth-коды вроде
`invalid_credentials`. См.
[схему ownership](../../../docs/architecture.ru.md#ответственность-consumer-приложения).

## Ошибки полей формы

```tsx
import { useFieldErrorMessage, useFirstApiFieldError } from "@orcestr/core-react";

const fieldError = useFirstApiFieldError(error, ["items", 0, "quantity"]);
const message = useFieldErrorMessage(fieldError, "Некорректное количество.");
```

`useApiFieldErrors(error)` возвращает все поля, сгруппированные по JSON Pointer, когда это нужно
form adapter.

## Глобальные уведомления TanStack Query

Создайте один controller и подключите его к query и mutation caches:

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
  resolve: (error) => ({ title: "Ошибка запроса", message: String(error) }),
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

В приложении замени `console.error` на адаптер toast или уведомлений.

`ErrorNotificationController` запоминает обработанные объекты ошибок и не допускает повторные
глобальные уведомления. Mutation с собственным `onError` считается обработанной локально. При
смене locale-dependent resolver или callback уведомления вызовите `controller.configure(...)`.

## Публичный API

| Область | Exports |
| --- | --- |
| Контекст сообщений | `ErrorMessagesProvider`, `useErrorMessage` |
| Ошибки полей | `useApiFieldErrors`, `useFirstApiFieldError`, `useFieldErrorMessage` |
| Уведомления | `ErrorNotificationController`, `ErrorNotificationProvider`, `useErrorNotifications` |
| TanStack Query | `createQueryErrorHandler`, `createMutationErrorHandler` |

Визуальные компоненты, toast UI и router behavior остаются в приложении. Notification callback
можно подключить к `useToast()` из [Orcestr UI](https://github.com/Artasov/orcestr-ui) или к
другой UI-системе.
