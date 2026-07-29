import type { ErrorNotificationController } from "./notifications.js";

type MutationWithOptions = {
  options?: {
    onError?: unknown;
  };
};

export function createQueryErrorHandler(
  controller: ErrorNotificationController,
): (error: unknown) => void {
  return (error) => {
    controller.notify(error);
  };
}

export function createMutationErrorHandler(
  controller: ErrorNotificationController,
): (
  error: unknown,
  variables: unknown,
  context: unknown,
  mutation: MutationWithOptions,
) => void {
  return (error, _variables, _context, mutation) => {
    if (mutation.options?.onError) {
      controller.markHandled(error);
      return;
    }
    controller.notify(error);
  };
}

