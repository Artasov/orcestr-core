"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

import { ErrorNotificationController } from "./notifications.js";

const ErrorNotificationContext =
  createContext<ErrorNotificationController | null>(null);

export function ErrorNotificationProvider({
  controller,
  children,
}: {
  controller: ErrorNotificationController;
  children: ReactNode;
}) {
  return (
    <ErrorNotificationContext.Provider value={controller}>
      {children}
    </ErrorNotificationContext.Provider>
  );
}

export function useErrorNotifications(): ErrorNotificationController {
  const controller = useContext(ErrorNotificationContext);
  if (!controller) {
    throw new Error(
      "useErrorNotifications must be used inside ErrorNotificationProvider.",
    );
  }
  return controller;
}

