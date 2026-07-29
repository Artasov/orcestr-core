from __future__ import annotations

import logging
from collections.abc import Sequence
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from ..errors import ApiError
from ..models import ApiErrorBody, ApiErrorResponse, ApiFieldError
from .request_id import REQUEST_ID_HEADER_NAME

logger = logging.getLogger("orcestr_core.fastapi")

_STATUS_CODES = {
    400: "bad_request",
    401: "not_authenticated",
    402: "payment_required",
    403: "forbidden",
    404: "not_found",
    405: "method_not_allowed",
    409: "conflict",
    413: "payload_too_large",
    415: "unsupported_media_type",
    422: "validation_error",
    429: "rate_limited",
    500: "server_error",
    502: "bad_gateway",
    503: "service_unavailable",
    504: "gateway_timeout",
}

_STATUS_MESSAGES = {
    400: "The request is invalid.",
    401: "Authentication is required.",
    402: "Payment is required.",
    403: "You do not have access to this resource.",
    404: "The requested resource was not found.",
    405: "The request method is not allowed.",
    409: "The request conflicts with the current state.",
    413: "The request payload is too large.",
    415: "The request media type is not supported.",
    422: "Check the submitted fields.",
    429: "Too many requests. Try again later.",
    500: "An internal server error occurred.",
    502: "An upstream service returned an invalid response.",
    503: "The service is temporarily unavailable.",
    504: "An upstream service did not respond in time.",
}


def register_api_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def handle_api_error(request: Request, exc: ApiError) -> JSONResponse:
        request_id = _request_id(request)
        _log_error(request, exc, request_id=request_id)
        return _response(
            status_code=exc.status_code,
            body=exc.body(request_id=request_id),
            headers=exc.headers,
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        error = ApiError(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            code="validation_error",
            message="Check the submitted fields.",
            fields=_validation_fields(exc.errors()),
        )
        return await handle_api_error(request, error)

    @app.exception_handler(StarletteHTTPException)
    async def handle_framework_http_error(
        request: Request,
        exc: StarletteHTTPException,
    ) -> JSONResponse:
        error = ApiError(
            status_code=exc.status_code,
            code=_status_code(exc.status_code),
            message=_status_message(exc.status_code),
            headers=exc.headers,
        )
        return await handle_api_error(request, error)

    @app.exception_handler(Exception)
    async def handle_unexpected_error(
        request: Request,
        exc: Exception,
    ) -> JSONResponse:
        request_id = _request_id(request)
        logger.error(
            "%s %s -> 500 server_error request_id=%s",
            request.method,
            request.url.path,
            request_id,
            exc_info=(type(exc), exc, exc.__traceback__),
        )
        return _response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            body=ApiErrorBody(
                code="server_error",
                message="An internal server error occurred.",
                request_id=request_id,
            ),
            headers={REQUEST_ID_HEADER_NAME: request_id} if request_id else None,
        )


def _validation_fields(
    errors: list[dict[str, Any]] | Sequence[Any],
) -> list[ApiFieldError]:
    fields: list[ApiFieldError] = []
    for raw in errors:
        loc = list(raw.get("loc", []))
        if loc and loc[0] in {"body", "query", "path", "header", "cookie"}:
            loc = loc[1:]
        path = [part for part in loc if isinstance(part, (str, int))]
        fields.append(
            ApiFieldError(
                path=path,
                code=_validation_code(raw.get("type")),
                message=str(raw.get("msg") or "Invalid value."),
                params=_validation_context(raw.get("ctx")),
            )
        )
    return fields


def _validation_code(value: Any) -> str:
    if not isinstance(value, str) or not value:
        return "invalid_value"
    normalized = value.replace(".", "_").replace("-", "_").lower()
    return normalized if normalized[0].isalpha() else f"invalid_{normalized}"


def _validation_context(value: Any) -> dict[str, str | int | float | bool | None] | None:
    if not isinstance(value, dict):
        return None
    params: dict[str, str | int | float | bool | None] = {}
    for key, item in value.items():
        if item is None or isinstance(item, (str, int, float, bool)):
            params[str(key)] = item
    return params or None


def _request_id(request: Request) -> str | None:
    value = getattr(request.state, "request_id", None)
    return value if isinstance(value, str) and value else None


def _status_code(status_code: int) -> str:
    return _STATUS_CODES.get(status_code, f"http_{status_code}")


def _status_message(status_code: int) -> str:
    return _STATUS_MESSAGES.get(status_code, "The request could not be completed.")


def _response(
    *,
    status_code: int,
    body: ApiErrorBody,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    response = ApiErrorResponse(error=body)
    return JSONResponse(
        status_code=status_code,
        content=response.model_dump(exclude_none=True),
        headers=headers,
    )


def _log_error(request: Request, error: ApiError, *, request_id: str | None) -> None:
    if error.status_code == status.HTTP_401_UNAUTHORIZED:
        return
    level = logging.ERROR if error.status_code >= 500 else logging.WARNING
    logger.log(
        level,
        "%s %s -> %s %s request_id=%s: %s",
        request.method,
        request.url.path,
        error.status_code,
        error.code,
        request_id,
        error.message,
    )
