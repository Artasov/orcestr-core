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

`ApiQueryProvider` создаёт отдельные query cache и controller для каждого корня приложения,
в том числе каждого SSR-запроса. Не разделяйте модульный singleton между пользователями:

```tsx
import type { ReactNode } from "react";
import { ApiQueryProvider } from "@orcestr/core-react";

function QueryProviders({ children }: { children: ReactNode }) {
  return (
    <ApiQueryProvider
      resolveError={(error) => ({ title: "Ошибка запроса", message: String(error) })}
      notifyError={({ title, message }) => console.error(`${title}: ${message}`)}
      defaultOptions={{ queries: { retry: false } }}
    >
      {children}
    </ApiQueryProvider>
  );
}
```

Замените `console.error` на адаптер уведомлений приложения. Каталоги ошибок, retry, auth и
маршрутизация остаются продуктовыми настройками. `suppressQueryError(error)` отключает выбранные
уведомления, не меняя состояние запроса. Resolver, sink и callback подавления обновляются при
рендере без сброса кэша; `defaultOptions` применяется при создании клиента один раз за mount.
Размещайте provider выше компонентов, которые могут приостанавливать рендер через Suspense.

`ErrorNotificationController` запоминает обработанные объекты ошибок и не допускает повторные
глобальные уведомления. Mutation с собственным `onError` считается обработанной локально. При
смене locale-dependent resolver или callback уведомления вызовите `controller.configure(...)`.

## Публичный API

| Область | Exports |
| --- | --- |
| Контекст сообщений | `ErrorMessagesProvider`, `useErrorMessage` |
| Ошибки полей | `useApiFieldErrors`, `useFirstApiFieldError`, `useFieldErrorMessage` |
| Уведомления | `ErrorNotificationController`, `ErrorNotificationProvider`, `useErrorNotifications` |
| TanStack Query | `ApiQueryProvider`, `createQueryErrorHandler`, `createMutationErrorHandler` |

Визуальные компоненты, toast UI и router behavior остаются в приложении. Notification callback
можно подключить к `useToast()` из [Orcestr UI](https://github.com/Artasov/orcestr-ui) или к
другой UI-системе.
