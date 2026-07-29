from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from orcestr_core.models import ApiErrorResponse

FIXTURES = Path(__file__).parents[2] / "contracts" / "fixtures"
VALID_FIXTURES = sorted(path.name for path in (FIXTURES / "valid").glob("*.json"))
INVALID_FIXTURES = sorted(
    path.name for path in (FIXTURES / "invalid").glob("*.json")
)


@pytest.mark.parametrize("name", VALID_FIXTURES)
def test_shared_valid_fixtures(name: str) -> None:
    raw = json.loads((FIXTURES / "valid" / name).read_text(encoding="utf-8"))
    parsed = ApiErrorResponse.model_validate(raw)
    assert parsed.error.code


@pytest.mark.parametrize("name", INVALID_FIXTURES)
def test_shared_invalid_fixtures(name: str) -> None:
    raw = json.loads((FIXTURES / "invalid" / name).read_text(encoding="utf-8"))
    with pytest.raises(ValidationError):
        ApiErrorResponse.model_validate(raw)
