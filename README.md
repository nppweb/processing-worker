# processing-worker

![CI](https://img.shields.io/badge/CI-GitHub_Actions-2088FF?logo=githubactions&logoColor=white)
![CD](https://img.shields.io/badge/CD-GitHub_Deploy-2ea44f?logo=github&logoColor=white)
![Container](https://img.shields.io/badge/Container-GHCR-2496ED?logo=docker&logoColor=white)

Сервис асинхронной обработки и нормализации собранных данных.

## Что делает этот репозиторий

- читает `source.raw.v1` из RabbitMQ;
- валидирует raw-события;
- нормализует payload до формата `source.normalized.v1`;
- публикует нормализованные события и отправляет ingest mutation в `backend-api`.

## Черновая реализация

- consumer RabbitMQ (`src/messaging/queue-client.ts`);
- нормализатор (`src/normalize.ts`);
- валидация raw/normalized схем через Ajv;
- GraphQL-клиент отправки в backend (`src/backend-client.ts`);
- Dockerfile и CI workflow.

## Локальный запуск

```bash
cp .env.example .env
npm install
npm run start:dev
```

## Важные переменные

- `RABBITMQ_URL`
- `QUEUE_RAW_EVENT`
- `QUEUE_NORMALIZED_EVENT`
- `API_GRAPHQL_URL`
- `SHARED_CONTRACTS_DIR`

## Связи с другими репозиториями

- получает события от `scraper-service`;
- использует схемы из `shared-contracts`;
- отправляет результаты в `backend-api`.
