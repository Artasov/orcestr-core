<p align="right">
  <a href="./README.md">English</a> · <strong>Русский</strong>
</p>

# @orcestr/core-next

Небольшие Next.js-адаптеры для независимого от framework пакета `@orcestr/core`.

## Установка

```bash
npm install @orcestr/core @orcestr/core-next next
```

## Безопасные пути и редиректы

```ts
import { internalRedirect, requestInternalPath } from "@orcestr/core-next";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const currentPath = requestInternalPath(request, "/");
  const login = `/login?next=${encodeURIComponent(currentPath)}`;

  return internalRedirect(request, login, "/login", {
    trustProxy: true,
    allowedHosts: ["app.example.com"],
    fallbackOrigin: "https://app.example.com",
  });
}
```

`requestInternalPath` оставляет pathname, search и hash запроса и проверяет результат через
`safeInternalPath`.

`internalRedirect` проверяет target как внутренний путь, определяет доверенный origin запроса и
возвращает `NextResponse.redirect(...)`.

## Настройка trusted proxy

```ts
import { requestHost, requestOrigin, requestProtocol } from "@orcestr/core-next";

const options = {
  trustProxy: true,
  allowedHosts: ["app.example.com", "admin.example.com"],
  fallbackOrigin: "https://app.example.com",
};

const protocol = requestProtocol(request, options);
const host = requestHost(request, options);
const origin = requestOrigin(request, options);
```

- Forwarded host и protocol headers игнорируются без явного `trustProxy: true`.
- `allowedHosts` сравнивает точные значения host, включая port при его наличии.
- `requestOrigin` выбрасывает исключение, если ни host запроса, ни `fallbackOrigin` не разрешены.
- Production за доверенным reverse proxy должен передавать и `trustProxy: true`, и явный список
  `allowedHosts`.

Пакет ничего не знает об auth cookies, login routes и protected-route policy. Референсная
интеграция находится в
[`@orcestr/auth-next`](https://github.com/Artasov/orcestr-auth/tree/main/frontend/packages/next),
а product-specific политика защищённых routes остаётся в приложении.

## Публичный API

| Export | Назначение |
| --- | --- |
| `requestInternalPath` | Текущий безопасный внутренний URL path |
| `internalRedirect` | Безопасный redirect через проверенный request origin |
| `requestProtocol` | Прямой или доверенный forwarded HTTP protocol |
| `requestHost` | Прямой или доверенный forwarded host |
| `requestOrigin` | Проверенный HTTP(S) origin |
| `RequestOriginOptions` | Настройки `trustProxy`, `allowedHosts` и `fallbackOrigin` |
