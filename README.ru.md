<p align="right">
  <a href="./README.md">English</a> · <strong>Русский</strong>
</p>

# Orcestr Core

Общие, не зависящие от бизнес-домена API-контракты и framework-адаптеры приложений Orcestr.

Orcestr Core сохраняет единый формат ошибок, пути полей, request ID и безопасные редиректы в
Python, TypeScript, React и Next.js. Он дополняет
[Orcestr Auth](https://github.com/Artasov/orcestr-auth), который отвечает за переиспользуемую
механику авторизации, и [Orcestr UI](https://github.com/Artasov/orcestr-ui), который отвечает за
визуальные компоненты и design tokens. Продуктовые правила и коды ошибок остаются в
consumer-приложении.

## Пакеты

| Пакет | Runtime | Назначение |
| --- | --- | --- |
| [`orcestr-core`](./backend/README.ru.md) | Python 3.12+ | Модели ошибок, request context и опциональные FastAPI-адаптеры |
| [`@orcestr/core`](./frontend/packages/core/README.ru.md) | Browser или server JavaScript | Fetch transport, строгий parser ошибок, каталоги, пути полей и безопасные внутренние пути |
| [`@orcestr/core-react`](./frontend/packages/core-react/README.ru.md) | React 18/19 | Локализованное представление ошибок и адаптеры уведомлений TanStack Query |
| [`@orcestr/core-next`](./frontend/packages/core-next/README.ru.md) | Next.js 15/16 | Проверка origin запроса и безопасные редиректы |

Пакеты устанавливаются независимо, но используют единый контракт:

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

Коды ошибок записываются в lowercase `snake_case`. Domain-слой consumer-приложения владеет
своими кодами и локализованными каталогами; например, Orcestr Auth владеет auth-кодами вроде
`invalid_credentials`. `message` служит безопасным диагностическим fallback, а не основным
текстом пользовательского интерфейса. Конкретная схема ownership описана в
[архитектуре](./docs/architecture.ru.md).

## Установка

```bash
pip install "orcestr-core[fastapi]"
npm install @orcestr/core @orcestr/core-react @orcestr/core-next
```

Устанавливайте только нужные адаптеры. React, TanStack Query, Next.js и FastAPI остаются
опциональными peer/extra-зависимостями.

## Сквозное подключение

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
    `Заказ ${params.order_id ?? ""} уже закрыт.`,
} satisfies ErrorCatalog;

try {
  await api.request("orders/42/close/", { method: "POST", timeoutMs: 10_000 });
} catch (error) {
  if (isApiError(error)) {
    console.log(resolveApiErrorMessage(error, catalog, "Не удалось закрыть заказ."));
  }
}
```

FastAPI validation fields, интеграция React Query и правила trusted proxy для Next.js подробно
описаны в README соответствующих пакетов.

## Границы ответственности

| Владелец | Ответственность | С чего начать |
| --- | --- | --- |
| Orcestr Core (этот репозиторий) | Error envelope, строгий parser, HTTP transport, пути полей, request IDs и framework adapters | [Обзор пакетов](#пакеты) и [архитектура](./docs/architecture.ru.md) |
| [Orcestr Auth](https://github.com/Artasov/orcestr-auth) | Механика login/session/OAuth, auth-коды ошибок, refresh policy и auth routes | [README Orcestr Auth](https://github.com/Artasov/orcestr-auth/blob/main/README.ru.md) |
| Product/domain-код consumer-приложения | Бизнес-коды ошибок, переводы, retry decisions и продуктовые правила; это код приложения, а не ещё один пакет Core | [Описание ownership](./docs/architecture.ru.md#ответственность-consumer-приложения) |
| [Orcestr UI](https://github.com/Artasov/orcestr-ui) или другой UI-слой | Dialogs, alerts, toasts и визуальное оформление; Core React отдаёт только presentation data и callbacks | [Руководство Orcestr UI](https://github.com/Artasov/orcestr-ui/blob/main/docs/CONSUMER_GUIDE.ru.md) |

Приложение не должно строить бизнес-логику по человекочитаемому `message`.

## Документация

- [Архитектура](./docs/architecture.ru.md)
- [Контракт ошибок](./docs/error-contract.ru.md)
- [Backend-пакет](./backend/README.ru.md)
- [`@orcestr/core`](./frontend/packages/core/README.ru.md)
- [`@orcestr/core-react`](./frontend/packages/core-react/README.ru.md)
- [`@orcestr/core-next`](./frontend/packages/core-next/README.ru.md)
- [Правила разработки](./CONTRIBUTING.md)

## Разработка

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

## Лицензия

Проект распространяется по [Mozilla Public License 2.0](./LICENSE). Дополнительная информация:
[NOTICE](./NOTICE) и [TRADEMARKS.md](./TRADEMARKS.md).
