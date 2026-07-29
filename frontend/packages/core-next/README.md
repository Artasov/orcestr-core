# @orcestr/core-next

Next.js adapters for the framework-independent `@orcestr/core` package.

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

Forwarded host/protocol headers are ignored unless `trustProxy` is explicitly
enabled. Production callers should also provide `allowedHosts`. This package
does not know auth cookies, login routes, or protected-route policy; those
belong to `@orcestr/auth-next`.
