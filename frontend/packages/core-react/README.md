# @orcestr/core-react

React and TanStack Query adapters for `@orcestr/core`. The package contains no
UI components and does not depend on `@orcestr/ui`.

```tsx
<ErrorMessagesProvider catalog={catalog} fallback="Unable to complete.">
  <ErrorNotificationProvider controller={controller}>
    {children}
  </ErrorNotificationProvider>
</ErrorMessagesProvider>
```

Use `useErrorMessage`, `useApiFieldErrors`, and `useFirstApiFieldError` in
forms. `ErrorNotificationController` prevents duplicate notifications and can
be reconfigured when the application locale changes.
