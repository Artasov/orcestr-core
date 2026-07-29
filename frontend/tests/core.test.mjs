import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

import {
  ApiClient,
  ApiError,
  CORE_ERROR_CODES,
  fieldPathToFormName,
  fieldPathToPointer,
  groupFieldErrors,
  interpolateErrorMessage,
  parseApiError,
  parseApiErrorPayload,
  safeInternalPath,
} from "../packages/core/dist/index.js";

const fixture = async (path) =>
  JSON.parse(
    await readFile(new URL(`../../contracts/fixtures/${path}`, import.meta.url)),
  );

test("shared valid and invalid fixtures follow the strict contract", async () => {
  const fixturesRoot = new URL("../../contracts/fixtures/", import.meta.url);
  const validNames = await readdir(new URL("valid/", fixturesRoot));
  const invalidNames = await readdir(new URL("invalid/", fixturesRoot));

  for (const name of validNames.filter((item) => item.endsWith(".json"))) {
    assert.ok(
      parseApiErrorPayload(await fixture(`valid/${name}`)),
      `${name} must be valid`,
    );
  }
  for (const name of invalidNames.filter((item) => item.endsWith(".json"))) {
    assert.equal(
      parseApiErrorPayload(await fixture(`invalid/${name}`)),
      undefined,
      `${name} must be invalid`,
    );
  }
});

test("malformed server errors become a protocol error, not a legacy guess", () => {
  const error = parseApiError(
    429,
    { detail: "invalid_credentials" },
    new Headers({ "retry-after": "30" }),
  );
  assert.equal(error.status, 429);
  assert.equal(error.code, CORE_ERROR_CODES.invalidResponse);
  assert.equal(error.retryAfterSeconds, 30);
});

test("field paths support nested arrays and a lossless JSON pointer", () => {
  const path = ["items", 0, "a/b~c"];
  assert.equal(fieldPathToPointer(path), "/items/0/a~1b~0c");
  assert.equal(fieldPathToFormName(path), "items[0].a/b~c");
  const duplicatePath = [
    { path, code: "required" },
    { path, code: "invalid_value" },
  ];
  assert.equal(groupFieldErrors(duplicatePath).get("/items/0/a~1b~0c").length, 2);
});

test("ApiError creates an immutable presentation copy without losing metadata", () => {
  const original = new ApiError(
    429,
    {
      code: "rate_limited",
      message: "Safe server diagnostic.",
      params: { scope: "login" },
      fields: [{ path: ["email"], code: "invalid", message: "Invalid" }],
      details: { limit: 3 },
      request_id: "request-copy",
    },
    { retryAfterSeconds: 60 },
  );

  const presented = original.withMessage("Localized presentation.");

  assert.notEqual(presented, original);
  assert.equal(original.message, "Safe server diagnostic.");
  assert.equal(presented.message, "Localized presentation.");
  assert.equal(presented.status, original.status);
  assert.equal(presented.code, original.code);
  assert.deepEqual(presented.params, original.params);
  assert.deepEqual(presented.fields, original.fields);
  assert.deepEqual(presented.details, original.details);
  assert.equal(presented.requestId, original.requestId);
  assert.equal(presented.retryAfterSeconds, original.retryAfterSeconds);
});

test("message interpolation keeps unknown placeholders visible", () => {
  assert.equal(
    interpolateErrorMessage("Minimum {minimum}; {unknown}", { minimum: 3 }),
    "Minimum 3; {unknown}",
  );
});

test("safe internal paths reject external and ambiguous redirects", () => {
  assert.equal(safeInternalPath("/orders?tab=new#top"), "/orders?tab=new#top");
  for (const unsafe of [
    "https://evil.example/path",
    "//evil.example/path",
    "/\\evil.example",
    "/%5cevil.example",
    "/%255cevil.example",
    "/%2f%2fevil.example",
    "/path%00",
    "/path\u0000",
  ]) {
    assert.equal(safeInternalPath(unsafe, "/fallback"), "/fallback");
  }
  assert.equal(
    safeInternalPath("https://evil.example", "//fallback.example"),
    "/",
  );
  assert.equal(
    safeInternalPath(`/${"a".repeat(2048)}`, "/fallback"),
    "/fallback",
  );
});

test("ApiClient parses strict error envelopes and Retry-After", async () => {
  const client = new ApiClient({
    execute: async () =>
      new Response(
        JSON.stringify({
          error: {
            code: "auth_rate_limited",
            message: "Too many attempts.",
          },
        }),
        {
          status: 429,
          headers: {
            "content-type": "application/json",
            "retry-after": "15",
          },
        },
      ),
  });
  await assert.rejects(
    client.request("/login"),
    (error) =>
      error.code === "auth_rate_limited" &&
      error.status === 429 &&
      error.retryAfterSeconds === 15,
  );
});

test("ApiClient handles 204 without parsing JSON", async () => {
  const client = new ApiClient({
    execute: async () => new Response(null, { status: 204 }),
  });
  assert.equal(await client.request("/logout"), undefined);
});

test("ApiClient exposes the real response status when requested", async () => {
  const client = new ApiClient({
    execute: async () =>
      new Response(JSON.stringify({ id: 42 }), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
  });
  const result = await client.requestWithResponse("/items", { method: "POST" });
  assert.deepEqual(result.data, { id: 42 });
  assert.equal(result.response.status, 201);
});

test("ApiClient reports malformed success JSON as a protocol error", async () => {
  const events = [];
  const client = new ApiClient({
    execute: async () =>
      new Response("{not-json", {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    onResponse: (event) => events.push(["response", event]),
    onError: (event) => events.push(["error", event]),
  });

  await assert.rejects(
    client.request("/items"),
    (error) =>
      error.code === CORE_ERROR_CODES.invalidResponse &&
      error.status === 200,
  );
  assert.equal(events.length, 1);
  assert.equal(events[0][0], "error");
  assert.equal(events[0][1].status, 200);
});

test("ApiClient supports text, blob, and FormData without forcing JSON", async () => {
  const textClient = new ApiClient({
    execute: async () => new Response("hello", { status: 200 }),
  });
  assert.equal(
    await textClient.request("/text", { responseType: "text" }),
    "hello",
  );

  const blobClient = new ApiClient({
    execute: async () => new Response("binary", { status: 200 }),
  });
  const blob = await blobClient.request("/blob", { responseType: "blob" });
  assert.equal(await blob.text(), "binary");

  const body = new FormData();
  body.set("name", "value");
  const formClient = new ApiClient({
    execute: async (_input, init) => {
      assert.equal(init.body, body);
      assert.equal(new Headers(init.headers).has("content-type"), false);
      return new Response(null, { status: 204 });
    },
  });
  await formClient.request("/form", { method: "POST", body });
});

test("ApiClient distinguishes network failures, timeouts, and cancellation", async () => {
  const networkClient = new ApiClient({
    execute: async () => {
      throw new TypeError("offline");
    },
  });
  await assert.rejects(
    networkClient.request("/network"),
    (error) => error.code === CORE_ERROR_CODES.network,
  );

  const waitForAbort = async (_input, init) =>
    new Promise((_resolve, reject) => {
      const rejectAbort = () =>
        reject(
          init.signal?.reason ??
            new DOMException("The request was cancelled.", "AbortError"),
        );
      if (init.signal?.aborted) rejectAbort();
      else init.signal?.addEventListener("abort", rejectAbort, { once: true });
    });
  const timeoutClient = new ApiClient({ execute: waitForAbort });
  await assert.rejects(
    timeoutClient.request("/timeout", { timeoutMs: 5 }),
    (error) => error.code === CORE_ERROR_CODES.timeout,
  );

  const abortClient = new ApiClient({ execute: waitForAbort });
  const controller = new AbortController();
  controller.abort(new DOMException("Cancelled.", "AbortError"));
  await assert.rejects(
    abortClient.request("/abort", { signal: controller.signal }),
    (error) => error.code === CORE_ERROR_CODES.aborted,
  );
});

test("ApiClient preserves ApiError-compatible values across bundle boundaries", async () => {
  const externalError = Object.assign(new Error("External API error."), {
    name: "ApiError",
    status: 409,
    code: "external_conflict",
    fields: [],
  });
  const client = new ApiClient({
    execute: async () => {
      throw externalError;
    },
  });

  await assert.rejects(
    () => client.request("/cross-realm"),
    (error) => error === externalError,
  );
});

test("ApiClient recognizes cross-realm abort errors", async () => {
  const client = new ApiClient({
    execute: async () => {
      throw { name: "AbortError" };
    },
  });

  await assert.rejects(
    () => client.request("/cross-realm-abort"),
    (error) => error.code === CORE_ERROR_CODES.aborted,
  );
});
