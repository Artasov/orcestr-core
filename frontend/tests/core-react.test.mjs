import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useQueryClient } from "@tanstack/react-query";

import { ApiError } from "../packages/core/dist/index.js";
import {
  ErrorNotificationController,
  createMutationErrorHandler,
  ApiQueryProvider,
  useErrorNotifications,
} from "../packages/core-react/dist/index.js";

function renderQueryProvider(props = {}) {
  let runtime;
  function Probe() {
    runtime = {client: useQueryClient(), controller: useErrorNotifications()};
    return null;
  }
  renderToStaticMarkup(createElement(ApiQueryProvider, {
    resolveError: (error) => ({title: "Error", message: error.message}),
    notifyError: () => undefined,
    defaultOptions: {queries: {retry: false, gcTime: 0}, mutations: {gcTime: 0}},
    ...props,
  }, createElement(Probe)));
  return runtime;
}

test("ApiQueryProvider isolates caches between application roots and SSR requests", () => {
  const first = renderQueryProvider();
  const second = renderQueryProvider();
  first.client.setQueryData(["user"], {id: 1});
  assert.equal(second.client.getQueryData(["user"]), undefined);
  assert.notEqual(first.controller, second.controller);
  first.client.clear();
  second.client.clear();
});

test("ApiQueryProvider notifies query failures once and supports product suppression", async () => {
  const received = [];
  const {client} = renderQueryProvider({
    notifyError: (presentation) => received.push(presentation),
    suppressQueryError: (error) => error.message === "unauthenticated",
  });
  const failure = new Error("failed");
  for (const error of [failure, failure, new Error("unauthenticated")]) {
    await assert.rejects(client.fetchQuery({queryKey: ["query"], queryFn: () => {throw error;}}));
  }
  assert.deepEqual(received, [{title: "Error", message: "failed"}]);
  client.clear();
});

test("ApiQueryProvider leaves locally handled mutations out of global notifications", async () => {
  const received = [];
  const {client, controller} = renderQueryProvider({
    notifyError: (presentation) => received.push(presentation),
  });
  const error = new Error("mutation failed");
  let locallyHandled = false;
  const mutation = client.getMutationCache().build(client, {
    mutationFn: () => {throw error;},
    onError: () => {locallyHandled = true;},
  });
  await assert.rejects(mutation.execute());
  assert.equal(locallyHandled, true);
  assert.equal(controller.wasHandled(error), true);
  assert.deepEqual(received, []);
  client.clear();
});

test("notification controller emits an error only once", () => {
  const received = [];
  const controller = new ErrorNotificationController({
    resolve: (error) => ({ title: "Error", message: error.message }),
    notify: (presentation) => received.push(presentation),
  });
  const error = new ApiError(500, {
    code: "server_error",
    message: "Failed.",
  });
  assert.equal(controller.notify(error), true);
  assert.equal(controller.notify(error), false);
  assert.equal(received.length, 1);
});

test("a mutation-specific onError owns presentation", () => {
  const received = [];
  const controller = new ErrorNotificationController({
    resolve: () => ({ title: "Error", message: "Failed." }),
    notify: (presentation) => received.push(presentation),
  });
  const error = new Error("failed");
  createMutationErrorHandler(controller)(
    error,
    undefined,
    undefined,
    { options: { onError: () => undefined } },
  );
  assert.equal(controller.wasHandled(error), true);
  assert.equal(received.length, 0);
});

test("notification controller applies the latest locale resolver", () => {
  const received = [];
  const controller = new ErrorNotificationController({
    resolve: () => ({ title: "Error", message: "Unable to complete." }),
    notify: (presentation) => received.push(presentation),
  });
  controller.configure({
    resolve: () => ({ title: "Ошибка", message: "Не удалось выполнить запрос." }),
    notify: (presentation) => received.push(presentation),
  });

  controller.notify(
    new ApiError(500, {
      code: "server_error",
      message: "Safe server diagnostic.",
    }),
  );

  assert.deepEqual(received, [
    { title: "Ошибка", message: "Не удалось выполнить запрос." },
  ]);
});

test("suppressed presentations are marked handled without a notification", () => {
  const received = [];
  const controller = new ErrorNotificationController({
    resolve: () => null,
    notify: (presentation) => received.push(presentation),
  });
  const error = new ApiError(0, {
    code: "request_aborted",
    message: "The request was cancelled.",
  });

  assert.equal(controller.notify(error), false);
  assert.equal(controller.wasHandled(error), true);
  assert.deepEqual(received, []);
});
