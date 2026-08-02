<p align="right">
  <a href="./README.md">English</a> · <strong>Русский</strong>
</p>

# orcestr-core

Python-контракты и опциональные FastAPI-адаптеры единого формата ошибок Orcestr API.

## Установка

```bash
pip install orcestr-core
pip install "orcestr-core[fastapi]"  # handlers, OpenAPI metadata и request ID для FastAPI
```

Базовый пакет зависит только от Pydantic. Для импорта `orcestr_core.fastapi` требуется extra
`fastapi`.

## Подключение FastAPI

Middleware и handlers регистрируются один раз при создании приложения:

```python
from fastapi import FastAPI
from orcestr_core.fastapi import RequestIdMiddleware, register_api_error_handlers

app = FastAPI()
app.add_middleware(RequestIdMiddleware)
register_api_error_handlers(app)
```

Handlers приводят к единому формату:

- `ApiError` с объявленным status и code;
- ошибки валидации FastAPI как `validation_error` со структурированными `fields`;
- HTTP exceptions Starlette как стабильные status-based коды;
- неожиданные исключения как не раскрывающий внутренности ответ `server_error`.

Каждый HTTP-ответ получает `x-request-id`. Безопасный входящий request ID сохраняется, иначе
middleware создаёт новый. `get_request_id()` позволяет сервисам получить текущее значение через
context variable.

## Доменные ошибки

```python
from orcestr_core import ApiError, ApiFieldError

raise ApiError(
    status_code=409,
    code="order_already_closed",
    message="The order is already closed.",
    params={"order_id": 42},
    fields=[
        ApiFieldError(
            path=["items", 0, "quantity"],
            code="greater_than",
            params={"gt": 0},
        )
    ],
)
```

Значения `code` должны использовать lowercase `snake_case`. `message` должен быть безопасен для
логов и fallback-отображения; обычный UI локализует текст по `code` и `params`.

## OpenAPI responses

```python
from fastapi import APIRouter
from orcestr_core.fastapi import api_error_responses

router = APIRouter()

@router.post(
    "/orders/{order_id}/close/",
    responses=api_error_responses(404, 409, 422),
)
async def close_order(order_id: int) -> None:
    ...
```

`api_error_responses` документирует общий envelope и не меняет runtime behavior.

## Публичные импорты

| Import | Назначение |
| --- | --- |
| `ApiError` | Контролируемое публичное API-исключение |
| `ApiErrorBody`, `ApiErrorResponse`, `ApiFieldError` | Строгие Pydantic-модели контракта |
| `get_request_id` | Текущий request ID для логов и downstream calls |
| `RequestIdMiddleware` | ASGI propagation request ID |
| `register_api_error_handlers` | Нормализация исключений FastAPI |
| `api_error_responses` | Переиспользуемые OpenAPI response metadata |

Первые модели и helper импортируются из `orcestr_core`, FastAPI-адаптеры — из
`orcestr_core.fastapi`.

## Разработка

```bash
uv sync --frozen
uv run pytest
uv build
```

Правила владения и совместимости описаны в [контракте ошибок](../docs/error-contract.md) и
[архитектуре](../docs/architecture.md).
