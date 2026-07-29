from __future__ import annotations

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from pydantic import BaseModel

from orcestr_core import ApiError
from orcestr_core.fastapi import (
    RequestIdMiddleware,
    api_error_responses,
    register_api_error_handlers,
)


class ValidationItem(BaseModel):
    sku: str


class ValidationPayload(BaseModel):
    items: list[ValidationItem]


def make_client() -> TestClient:
    app = FastAPI()
    app.add_middleware(RequestIdMiddleware)
    register_api_error_handlers(app)

    @app.get("/controlled")
    async def controlled() -> None:
        raise ApiError(
            status_code=409,
            code="order_already_closed",
            message="The order is already closed.",
        )

    @app.get("/unexpected")
    async def unexpected() -> None:
        raise RuntimeError("secret implementation detail")

    @app.get("/teapot")
    async def teapot() -> None:
        raise HTTPException(status_code=418, detail="secret framework detail")

    return TestClient(app, raise_server_exceptions=False)


def test_controlled_error_preserves_code_and_request_id() -> None:
    response = make_client().get(
        "/controlled",
        headers={"x-request-id": "request-test-1"},
    )
    assert response.status_code == 409
    assert response.headers["x-request-id"] == "request-test-1"
    assert response.json() == {
        "error": {
            "code": "order_already_closed",
            "message": "The order is already closed.",
            "request_id": "request-test-1",
        }
    }


def test_unexpected_error_is_safe() -> None:
    response = make_client().get("/unexpected")
    assert response.status_code == 500
    assert response.json()["error"]["code"] == "server_error"
    assert response.json()["error"]["request_id"]
    assert response.headers["x-request-id"] == response.json()["error"]["request_id"]
    assert "secret implementation detail" not in response.text


def test_framework_error_does_not_expose_raw_detail() -> None:
    response = make_client().get("/teapot")
    assert response.status_code == 418
    assert response.json()["error"]["code"] == "http_418"
    assert "secret framework detail" not in response.text


def test_validation_error_preserves_nested_field_path() -> None:
    app = FastAPI()
    app.add_middleware(RequestIdMiddleware)
    register_api_error_handlers(app)

    @app.post("/items")
    async def items(payload: ValidationPayload) -> None:
        return None

    response = TestClient(app).post(
        "/items",
        json={"items": [{}]},
        headers={"x-request-id": "validation-test"},
    )
    assert response.status_code == 422
    assert response.json() == {
        "error": {
            "code": "validation_error",
            "message": "Check the submitted fields.",
            "fields": [
                {
                    "path": ["items", 0, "sku"],
                    "code": "missing",
                    "message": "Field required",
                }
            ],
            "request_id": "validation-test",
        }
    }


def test_openapi_response_metadata_uses_the_shared_model() -> None:
    app = FastAPI(responses=api_error_responses(400, 422))

    @app.get("/items")
    async def items() -> list[str]:
        return []

    responses = app.openapi()["paths"]["/items"]["get"]["responses"]
    for status_code in ("400", "422"):
        schema = responses[status_code]["content"]["application/json"]["schema"]
        assert schema["$ref"].endswith("/ApiErrorResponse")


@pytest.mark.parametrize("status_code", [0, 200, 399, 600])
def test_api_error_rejects_non_error_status(status_code: int) -> None:
    with pytest.raises(ValueError):
        ApiError(
            status_code=status_code,
            code="invalid_status",
            message="Invalid status.",
        )
