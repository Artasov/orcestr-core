# @orcestr/core-next

Next.js-адаптеры для framework-independent пакета `@orcestr/core`.

```ts
import {
  internalRedirect,
  requestInternalPath,
  requestOrigin,
} from "@orcestr/core-next";

const next = requestInternalPath(request);
const origin = requestOrigin(request, {
  trustProxy: true,
  allowedHosts: ["deliveries.orcestr.com"],
});
return internalRedirect(request, next, "/", {
  trustProxy: true,
  allowedHosts: ["deliveries.orcestr.com"],
});
```

Forwarded host/protocol headers игнорируются, пока вызывающая сторона явно не
включит `trustProxy`. В production нужно также передавать `allowedHosts`.
Пакет не знает auth cookies, login routes и policy защищённых маршрутов — это
ответственность `@orcestr/auth-next`.
