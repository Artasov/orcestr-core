# Orcestr Core

Общие, не зависящие от предметной области контракты и framework-адаптеры приложений Orcestr.

Репозиторий публикует:

- `@orcestr/core` — API-ошибки, транспорт, каталоги сообщений и безопасные внутренние пути;
- `@orcestr/core-react` — представление ошибок в React и интеграцию с React Query;
- `@orcestr/core-next` — helpers запросов и редиректов Next.js;
- `orcestr-core` — Python-ошибки, схемы, request context и FastAPI adapters.

Коды ошибок принадлежат доменным пакетам. Core отвечает только за envelope и механизмы
передачи и представления ошибок.

Подробности: [архитектура](docs/architecture.md), [контракт
ошибок](docs/error-contract.md) и [правила разработки](CONTRIBUTING.md).
