import assert from "node:assert/strict";
import test from "node:test";

import {
  internalRedirect,
  requestInternalPath,
  requestHost,
  requestOrigin,
  requestProtocol,
} from "../packages/core-next/dist/index.js";

function request(origin, headers = {}) {
  const url = new URL(origin);
  return {
    nextUrl: {
      origin: url.origin,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
    },
    headers: new Headers(headers),
  };
}

test("request origin ignores forwarding headers unless proxy trust is explicit", () => {
  const incoming = request("https://internal:3000", {
    "x-forwarded-host": "app.example.com",
    "x-forwarded-proto": "https",
  });

  assert.equal(requestProtocol(incoming), "https");
  assert.equal(requestHost(incoming), "internal:3000");
  assert.equal(requestOrigin(incoming), "https://internal:3000");
});

test("request origin resolves trusted proxy host and protocol", () => {
  const incoming = request("http://internal:3000", {
    "x-forwarded-host": "app.example.com, proxy.internal",
    "x-forwarded-proto": "https, http",
  });

  assert.equal(
    requestOrigin(incoming, {
      trustProxy: true,
      allowedHosts: ["app.example.com"],
    }),
    "https://app.example.com",
  );
});

test("request origin rejects untrusted and malformed forwarded hosts", () => {
  const untrusted = request("http://internal:3000", {
    "x-forwarded-host": "evil.example",
    "x-forwarded-proto": "https",
  });
  assert.throws(
    () =>
      requestOrigin(untrusted, {
        trustProxy: true,
        allowedHosts: ["app.example.com"],
      }),
    /not allowed/,
  );

  const malformed = request("https://app.example.com", {
    "x-forwarded-host": "evil.example/path",
    "x-forwarded-proto": "https",
  });
  assert.equal(
    requestOrigin(malformed, {
      trustProxy: true,
      allowedHosts: ["app.example.com"],
    }),
    "https://app.example.com",
  );
});

test("request origin uses only a validated allowed fallback", () => {
  const incoming = request("http://internal:3000");
  assert.equal(
    requestOrigin(incoming, {
      allowedHosts: ["app.example.com"],
      fallbackOrigin: "https://app.example.com",
    }),
    "https://app.example.com",
  );
  assert.throws(
    () =>
      requestOrigin(incoming, {
        allowedHosts: ["app.example.com"],
        fallbackOrigin: "javascript:alert(1)",
      }),
    /fallbackOrigin/,
  );
});

test("Next redirect helpers retain safe internal paths on an allowed origin", () => {
  const incoming = request("http://internal:3000/current?tab=1", {
    "x-forwarded-host": "app.example.com",
    "x-forwarded-proto": "https",
  });
  assert.equal(requestInternalPath(incoming), "/current?tab=1");

  const response = internalRedirect(incoming, "/dashboard/overview", "/", {
    trustProxy: true,
    allowedHosts: ["app.example.com"],
  });
  assert.equal(
    response.headers.get("location"),
    "https://app.example.com/dashboard/overview",
  );
  assert.equal(response.status, 307);
});
