# @orcestr/core-react

React- и TanStack Query-адаптеры для `@orcestr/core`. Пакет не содержит
UI-компонентов и не зависит от `@orcestr/ui`.

```tsx
<ErrorMessagesProvider catalog={catalog} fallback="Не удалось выполнить запрос.">
  <ErrorNotificationProvider controller={controller}>
    {children}
  </ErrorNotificationProvider>
</ErrorMessagesProvider>
```

В формах используются `useErrorMessage`, `useApiFieldErrors` и
`useFirstApiFieldError`. `ErrorNotificationController` защищает от повторных
уведомлений и перенастраивается при смене локали приложения.
