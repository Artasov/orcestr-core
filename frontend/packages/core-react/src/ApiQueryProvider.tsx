"use client";

import {
  MutationCache, QueryCache, QueryClient, QueryClientProvider,
  type DefaultOptions,
} from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ErrorNotificationProvider } from "./notification-context.js";
import {
  ErrorNotificationController,
  type ErrorPresentationResolver,
  type ErrorNotificationSink,
} from "./notifications.js";
import { createMutationErrorHandler } from "./query.js";

export type ApiQueryProviderProps = {
  children: ReactNode;
  resolveError: ErrorPresentationResolver;
  notifyError: ErrorNotificationSink;
  defaultOptions?: DefaultOptions;
  suppressQueryError?: (error: unknown) => boolean;
};

/** Owns an isolated cache and deduplicated error notifications per mounted app. */
export function ApiQueryProvider({
  children, resolveError, notifyError, defaultOptions, suppressQueryError,
}: ApiQueryProviderProps) {
  const [runtime] = useState(() => {
    const controller = new ErrorNotificationController({resolve: resolveError, notify: notifyError});
    const options = {suppressQueryError};
    const client = new QueryClient({
      defaultOptions,
      queryCache: new QueryCache({
        onError: (error) => {
          if (!options.suppressQueryError?.(error)) controller.notify(error);
        },
      }),
      mutationCache: new MutationCache({onError: createMutationErrorHandler(controller)}),
    });
    return {client, controller, options};
  });
  runtime.options.suppressQueryError = suppressQueryError;
  runtime.controller.configure({resolve: resolveError, notify: notifyError});

  return (
    <QueryClientProvider client={runtime.client}>
      <ErrorNotificationProvider controller={runtime.controller}>
        {children}
      </ErrorNotificationProvider>
    </QueryClientProvider>
  );
}
