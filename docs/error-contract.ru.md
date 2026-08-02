<p align="right">
  <a href="./error-contract.md">English</a> · <strong>Русский</strong>
</p>

# Контракт API-ошибок

Каждая контролируемая HTTP-ошибка использует один envelope:

```json
{
  "error": {
    "code": "document_required_fields_missing",
    "message": "Required document fields are missing.",
    "params": { "document_kind": "invoice" },
    "fields": [
      {
        "path": ["supplier", "tax_id"],
        "code": "required",
        "message": "Tax ID is required."
      }
    ],
    "details": { "readiness": "blocked" },
    "request_id": "01J..."
  }
}
```

Правила:

- `code` — стабильный lowercase snake-case идентификатор, которым владеет
  domain-слой consumer-приложения. Например,
  [Orcestr Auth](https://github.com/Artasov/orcestr-auth) владеет кодом
  `invalid_credentials`, а модуль заказов может владеть
  `order_already_closed`;
- `message` — безопасный server-side diagnostic fallback, а не translation key;
- `params` содержит только примитивные значения для интерполяции;
- `fields` — упорядоченный список, сохраняющий несколько ошибок для одного
  вложенного пути;
- `details` содержит безопасные структурированные данные, необходимые для
  поведения приложения;
- `request_id` связывает response с server logs;
- clients отклоняют legacy или malformed envelopes, а не пытаются угадать их
  структуру;
- пользовательский client разрешает известные коды через каталог активной
  locale и использует локализованный generic fallback для неизвестных кодов.
  UI-слой вроде [Orcestr UI](https://github.com/Artasov/orcestr-ui) решает,
  показать результат как field error, alert или toast.
