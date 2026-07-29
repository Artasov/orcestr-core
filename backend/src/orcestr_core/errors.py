from __future__ import annotations

from collections.abc import Mapping, Sequence

from .models import ApiErrorBody, ApiFieldError
from .types import ErrorParams, JsonObject


class ApiError(Exception):
    """A controlled public API error with a stable machine-readable code."""

    def __init__(
        self,
        *,
        status_code: int,
        code: str,
        message: str,
        params: ErrorParams | None = None,
        fields: Sequence[ApiFieldError] | None = None,
        details: JsonObject | None = None,
        headers: Mapping[str, str] | None = None,
    ) -> None:
        if isinstance(status_code, bool) or not isinstance(status_code, int):
            raise TypeError("status_code must be an integer")
        if not 400 <= status_code <= 599:
            raise ValueError("status_code must be between 400 and 599")
        body = ApiErrorBody(
            code=code,
            message=message,
            params=params,
            fields=list(fields) if fields is not None else None,
            details=details,
        )
        super().__init__(message)
        self.status_code = status_code
        self.code = body.code
        self.message = body.message
        self.params = body.params
        self.fields = body.fields
        self.details = body.details
        self.headers = dict(headers or {})

    def body(self, *, request_id: str | None = None) -> ApiErrorBody:
        return ApiErrorBody(
            code=self.code,
            message=self.message,
            params=self.params,
            fields=self.fields,
            details=self.details,
            request_id=request_id,
        )
