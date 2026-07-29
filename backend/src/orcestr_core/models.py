from __future__ import annotations

import re

from pydantic import BaseModel, ConfigDict, Field, JsonValue, field_validator

from .types import ErrorParams, FieldPathPart

ERROR_CODE_PATTERN = re.compile(r"^[a-z][a-z0-9_]*$")


class ApiFieldError(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    path: list[FieldPathPart] = Field(default_factory=list)
    code: str
    message: str | None = None
    params: ErrorParams | None = None

    @field_validator("code")
    @classmethod
    def validate_code(cls, value: str) -> str:
        if not ERROR_CODE_PATTERN.fullmatch(value):
            raise ValueError("error code must use lowercase snake_case")
        return value

    @field_validator("message")
    @classmethod
    def validate_message(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("message must not be blank")
        return value


class ApiErrorBody(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    code: str
    message: str
    params: ErrorParams | None = None
    fields: list[ApiFieldError] | None = None
    details: dict[str, JsonValue] | None = None
    request_id: str | None = None

    @field_validator("code")
    @classmethod
    def validate_code(cls, value: str) -> str:
        if not ERROR_CODE_PATTERN.fullmatch(value):
            raise ValueError("error code must use lowercase snake_case")
        return value

    @field_validator("message", "request_id")
    @classmethod
    def validate_non_blank(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("value must not be blank")
        return value


class ApiErrorResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    error: ApiErrorBody
