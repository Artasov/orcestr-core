# @orcestr/core

Независимые от framework примитивы API-ошибок, транспорта, путей полей,
локализации и безопасной навигации для приложений Orcestr.

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
    // Показываем `message`, а не диагностический текст backend.
  }
}
```

Parser принимает только документированный envelope `{error: {...}}`.
Auth refresh, cookies, React, Next.js, UI-компоненты и продуктовые каталоги
ошибок намеренно находятся за пределами этого пакета.
