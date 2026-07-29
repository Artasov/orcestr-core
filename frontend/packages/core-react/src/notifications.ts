export type ErrorPresentation = {
  title: string;
  message: string;
};

export type ErrorPresentationResolver = (
  error: unknown,
) => ErrorPresentation | null;

export type ErrorNotificationSink = (
  presentation: ErrorPresentation,
) => void;

export class ErrorNotificationController {
  private readonly handled = new WeakSet<object>();
  private resolver: ErrorPresentationResolver;
  private sink: ErrorNotificationSink;

  constructor(options: {
    resolve: ErrorPresentationResolver;
    notify: ErrorNotificationSink;
  }) {
    this.resolver = options.resolve;
    this.sink = options.notify;
  }

  configure(options: {
    resolve: ErrorPresentationResolver;
    notify: ErrorNotificationSink;
  }): void {
    this.resolver = options.resolve;
    this.sink = options.notify;
  }

  markHandled(error: unknown): void {
    const target = objectValue(error);
    if (target) this.handled.add(target);
  }

  wasHandled(error: unknown): boolean {
    const target = objectValue(error);
    return target ? this.handled.has(target) : false;
  }

  notify(error: unknown): boolean {
    if (this.wasHandled(error)) return false;
    const presentation = this.resolver(error);
    this.markHandled(error);
    if (!presentation) return false;
    this.sink(presentation);
    return true;
  }
}

function objectValue(value: unknown): object | null {
  return value !== null &&
    (typeof value === "object" || typeof value === "function")
    ? value
    : null;
}

