# processing-worker

![CI](https://img.shields.io/badge/CI-GitHub_Actions-2088FF?logo=githubactions&logoColor=white)
![CD](https://img.shields.io/badge/CD-GitHub_Deploy-2ea44f?logo=github&logoColor=white)
![Container](https://img.shields.io/badge/Container-GHCR-2496ED?logo=docker&logoColor=white)

Сервис асинхронной обработки и нормализации собранных данных.

## Что делает этот репозиторий

- читает `source.raw.v1` из RabbitMQ;
- валидирует raw-события;
- нормализует payload до формата `source.normalized.v1`;
- отправляет ingest mutation `ingestNormalizedItem` в `backend-api` с заголовком `x-ingest-token`;
- после успешного ingest публикует нормализованные события в `source.normalized.v1`;
- при transient ошибках отправляет сообщение в retry queue, а poison messages складывает в DLQ.

## Черновая реализация

- consumer RabbitMQ (`src/messaging/queue-client.ts`);
- нормализатор (`src/normalize.ts`);
- валидация raw/normalized схем через Ajv;
- GraphQL-клиент отправки в backend (`src/backend-client.ts`);
- Dockerfile и CI workflow.

## Переменные окружения

- `RABBITMQ_URL` - адрес RabbitMQ.
- `QUEUE_RAW_EVENT` - основная очередь входящих raw-событий, по умолчанию `source.raw.v1`.
- `QUEUE_RETRY_EVENT` - очередь retry, по умолчанию `source.raw.retry.v1`.
- `QUEUE_DEAD_LETTER_EVENT` - очередь dead-letter, по умолчанию `source.raw.dlq.v1`.
- `QUEUE_NORMALIZED_EVENT` - очередь нормализованных событий, по умолчанию `source.normalized.v1`.
- `API_BASE_URL` - базовый URL `backend-api`, по умолчанию `http://localhost:3000`.
- `GRAPHQL_PATH` - GraphQL path, по умолчанию `/graphql`.
- `API_GRAPHQL_URL` - явный GraphQL URL. Если задан, имеет приоритет над `API_BASE_URL + GRAPHQL_PATH`.
- `API_INGEST_TOKEN` - токен для заголовка `x-ingest-token`. Должен совпадать с `INGEST_API_TOKEN` в `backend-api`.
- `SHARED_CONTRACTS_DIR` - путь к `shared-contracts`.
- `RETRY_ATTEMPTS`, `RETRY_BASE_DELAY_MS`, `PREFETCH`, `LOG_LEVEL` - параметры обработки и логирования.

## Локальный запуск

```bash
cp .env.example .env
npm install
npm run start:dev
```

Для Docker Compose сервис ожидает:

- RabbitMQ на `RABBITMQ_URL`;
- `backend-api` на `API_BASE_URL` или `API_GRAPHQL_URL`;
- смонтированный `shared-contracts` в `SHARED_CONTRACTS_DIR`.

## Ожидаемые очереди

- `source.raw.v1` - входящие события.
- `source.raw.retry.v1` - delayed retry queue.
- `source.raw.dlq.v1` - dead-letter queue.
- `source.normalized.v1` - успешно обработанные нормализованные события.

## Как проверить обработку

1. Опубликуй валидное сообщение в `source.raw.v1`.
2. В логах worker должны появиться строки `connected to rabbitmq`, `consuming queue`, `raw event validated`, `normalized event created`, `ingest success`, `published normalized event`, `message acknowledged`.
3. Проверь, что сообщение появилось в `source.normalized.v1`, а запись создалась в `backend-api`.
4. Для transient ошибки временно выключи `backend-api`: worker должен логировать `ingest failed` и `retry scheduled`, а не падать.
5. Для poison message отправь невалидный JSON или payload, нарушающий schema: worker должен логировать `message dead-lettered`, сообщение должно уйти в `source.raw.dlq.v1`.

## Связи с другими репозиториями

- получает события от `scraper-service`;
- использует схемы из `shared-contracts`;
- отправляет результаты в `backend-api`.
