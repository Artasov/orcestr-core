# API error contract

Every controlled HTTP error uses one envelope:

```json
{
  "error": {
    "code": "document_required_fields_missing",
    "message": "Required document fields are missing.",
    "params": {"document_kind": "invoice"},
    "fields": [
      {
        "path": ["supplier", "tax_id"],
        "code": "required",
        "message": "Tax ID is required."
      }
    ],
    "details": {"readiness": "blocked"},
    "request_id": "01J..."
  }
}
```

Rules:

- `code` is a stable lowercase snake-case identifier owned by a domain.
- `message` is a safe server-side diagnostic fallback, not a translation key.
- `params` contains only primitive interpolation values.
- `fields` is an ordered list and preserves multiple errors for one nested path.
- `details` contains safe structured data needed by application behavior.
- `request_id` correlates the response with server logs.
- clients must reject legacy or malformed envelopes instead of guessing.
- user-facing clients resolve known codes through the active locale catalog and
  use a localized generic fallback for unknown codes.

