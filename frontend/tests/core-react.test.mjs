import assert from "node:assert/strict";
import test from "node:test";

import { ApiError } from "../packages/core/dist/index.js";
import {
  ErrorNotificationController,
  createMutationErrorHandler,
} from "../packages/core-react/dist/index.js";

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
