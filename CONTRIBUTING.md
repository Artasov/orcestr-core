# Contributing

Keep core domain-neutral and preserve the dependency direction documented in
`docs/architecture.md`.

Before submitting a change:

```text
cd frontend
npm ci
npm test
npm run pack:dry-run

cd ../backend
uv sync --frozen
uv run pytest -q
uv build
```

Contract changes require matching TypeScript and Python fixtures. Breaking
wire-format or public API changes require a new major version.

