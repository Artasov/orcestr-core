from __future__ import annotations

from typing import Any

from ..models import ApiErrorResponse


def api_error_responses(*status_codes: int) -> dict[int, dict[str, Any]]:
    """Build reusable FastAPI response metadata for the shared error envelope."""

    return {
        status_code: {
            "model": ApiErrorResponse,
            "description": f"API error ({status_code})",
        }
        for status_code in status_codes
    }

