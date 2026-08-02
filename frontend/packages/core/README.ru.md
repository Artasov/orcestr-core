<p align="right">
  <a href="./README.md">English</a> · <strong>Русский</strong>
</p>

# @orcestr/core

Независимые от framework примитивы API transport, parsing ошибок, путей полей, локализации и
безопасной навигации для приложений Orcestr.

Пакет использует платформенные API `fetch`, `Headers`, `Response`, `AbortController` и `URL`. Он
не зависит от React, Next.js или `@orcestr/ui`.

## Установка

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
    console.warn(`${method} ${url}: ${status ?? "network"}, ${durationMs}ms`);
  },
});

const order = await api.request<{ id: number }>("orders/42/", {
  timeoutMs: 10_000,
});

const { data, response } = await api.requestWithResponse<Blob>("orders/42/pdf/", {
  responseType: "blob",
});
```

`responseType` поддерживает `json` по умолчанию, `text`, `blob` и исходный `response`. HTTP
failures преобразуются в `ApiError`. Невалидный success JSON, неправильный error envelope,
timeouts, отмена и network failures получают стабильные core error codes.

Клиент намеренно не реализует cookies, auth refresh и retry policy. Референсная реализация —
[Orcestr Auth](https://github.com/Artasov/orcestr-auth): пакет `@orcestr/auth-core` передаёт
собственную функцию `execute` с cookie credentials и одним циклом refresh/retry.

## Каталоги ошибок

```ts
import {
  isApiError,
  resolveApiErrorMessage,
  type ErrorCatalog,
} from "@orcestr/core";

const catalog = {
  order_already_closed: (params) => `Заказ ${params.order_id ?? ""} уже закрыт.`,
  forbidden: "У вас нет доступа к этому заказу.",
} satisfies ErrorCatalog;

try {
  await api.request("orders/42/close/", { method: "POST" });
} catch (error) {
  if (!isApiError(error)) throw error;
  const message = resolveApiErrorMessage(error, catalog, "Не удалось выполнить запрос.");
  console.log(error.status, error.code, error.requestId, message);
}
```

Для поведения и локализации используйте `code`. Серверный `message` считается диагностическим
fallback-текстом; бизнес-логика не должна сравнивать его значение.

## Ошибки полей

```ts
import { fieldPathToFormName, firstFieldError, groupFieldErrors } from "@orcestr/core";

if (isApiError(error)) {
  const quantity = firstFieldError(error.fields, ["items", 0, "quantity"]);
  const inputName = fieldPathToFormName(quantity?.path ?? []); // items[0].quantity
  const byJsonPointer = groupFieldErrors(error.fields);       // /items/0/quantity
}
```

Пути представлены массивами строк и чисел. Это убирает неоднозначные dotted strings backend и
позволяет каждому form adapter выбрать свою систему имён.

## Безопасная внутренняя навигация

```ts
import { safeInternalPath } from "@orcestr/core";

const next = safeInternalPath(searchParams.get("next"), "/overview");
```

`safeInternalPath` отклоняет absolute и protocol-relative URL, backslashes, control characters,
опасные декодированные пути и значения длиннее 2048 символов.

## Группы публичного API

| Область | Основные exports |
| --- | --- |
| Transport | `ApiClient`, `ApiRequestOptions`, `ApiResult` |
| Errors | `ApiError`, `isApiError`, `CORE_ERROR_CODES`, `parseApiError` |
| Contract | `ApiErrorEnvelope`, `ApiErrorPayload`, `ApiFieldError`, JSON types |
| Localization | `ErrorCatalog`, `resolveApiErrorMessage`, `interpolateErrorMessage` |
| Forms | `fieldPathToPointer`, `fieldPathToFormName`, `groupFieldErrors`, `firstFieldError` |
| Navigation | `safeInternalPath` |

Parser принимает только документированный envelope `{ "error": { ... } }` и отклоняет
неизвестные ключи. Полная схема описана в [контракте ошибок](../../../docs/error-contract.md).
