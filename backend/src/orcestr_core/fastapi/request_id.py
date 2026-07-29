from __future__ import annotations

import re
import uuid
from collections.abc import Awaitable, Callable, MutableSequence
from typing import Any

from ..request_context import reset_request_id, set_request_id

REQUEST_ID_HEADER_NAME = "x-request-id"
REQUEST_ID_HEADER = REQUEST_ID_HEADER_NAME.encode("ascii")
SAFE_REQUEST_ID = re.compile(r"^[A-Za-z0-9._:-]{1,128}$")

AsgiMessage = dict[str, Any]
AsgiReceive = Callable[[], Awaitable[AsgiMessage]]
AsgiSend = Callable[[AsgiMessage], Awaitable[None]]
AsgiApp = Callable[[dict[str, Any], AsgiReceive, AsgiSend], Awaitable[None]]


class RequestIdMiddleware:
    def __init__(self, app: AsgiApp) -> None:
        self.app = app

    async def __call__(
        self,
        scope: dict[str, Any],
        receive: AsgiReceive,
        send: AsgiSend,
    ) -> None:
        if scope.get("type") not in {"http", "websocket"}:
            await self.app(scope, receive, send)
            return

        request_id = _incoming_request_id(scope) or uuid.uuid4().hex
        scope.setdefault("state", {})["request_id"] = request_id
        token = set_request_id(request_id)

        async def send_with_request_id(message: AsgiMessage) -> None:
            if message.get("type") == "http.response.start":
                headers: MutableSequence[tuple[bytes, bytes]] = message.setdefault(
                    "headers", []
                )
                if not any(key.lower() == REQUEST_ID_HEADER for key, _ in headers):
                    headers.append((REQUEST_ID_HEADER, request_id.encode("ascii")))
            await send(message)

        try:
            await self.app(scope, receive, send_with_request_id)
        finally:
            reset_request_id(token)


def _incoming_request_id(scope: dict[str, Any]) -> str | None:
    for raw_name, raw_value in scope.get("headers", []):
        if raw_name.lower() != REQUEST_ID_HEADER:
            continue
        try:
            value = raw_value.decode("ascii")
        except UnicodeDecodeError:
            return None
        return value if SAFE_REQUEST_ID.fullmatch(value) else None
    return None
