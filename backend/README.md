<p align="right">
  <strong>English</strong> · <a href="./README.ru.md">Русский</a>
</p>

# orcestr-core

Python contracts and optional FastAPI adapters for the Orcestr API error envelope.

## Install

```bash
pip install orcestr-core
pip install "orcestr-core[fastapi]"  # FastAPI handlers, OpenAPI metadata and request IDs
```

The base package depends only on Pydantic. Importing `orcestr_core.fastapi` requires the
`fastapi` extra.

## FastAPI setup

Register the middleware and handlers once while creating the application:

```python
from fastapi import FastAPI
from orcestr_core.fastapi import RequestIdMiddleware, register_api_error_handlers

app = FastAPI()
app.add_middleware(RequestIdMiddleware)
register_api_error_handlers(app)
```

The handlers normalize:

- `ApiError` into its declared status and code;
- FastAPI validation errors into `validation_error` with structured `fields`;
- Starlette HTTP exceptions into stable status-based codes;
- unexpected exceptions into a non-leaking `server_error` response.

Every HTTP response receives `x-request-id`. An incoming safe request ID is preserved; otherwise
the middleware creates one. `get_request_id()` exposes the current value to application services
through a context variable.

## Raising domain errors

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

`code` values must use lowercase `snake_case`. Keep `message` safe for logs and fallback display;
clients should normally resolve localized copy from `code` and `params`.

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

`api_error_responses` documents the common envelope without changing runtime behavior.

## Public imports

| Import | Purpose |
| --- | --- |
| `ApiError` | Controlled public API exception |
| `ApiErrorBody`, `ApiErrorResponse`, `ApiFieldError` | Strict Pydantic contract models |
| `get_request_id` | Current request ID for logging and downstream calls |
| `RequestIdMiddleware` | ASGI request-ID propagation |
| `register_api_error_handlers` | FastAPI exception normalization |
| `api_error_responses` | Reusable OpenAPI response metadata |

The first four models/helpers are imported from `orcestr_core`; FastAPI adapters are imported
from `orcestr_core.fastapi`.

## Development

```bash
uv sync --frozen
uv run pytest
uv build
```

See the repository [error contract](../docs/error-contract.md) and
[architecture](../docs/architecture.md) for ownership and compatibility rules.
