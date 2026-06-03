# NestJS backend イメージ。ビルドコンテキストはリポジトリルート（モノレポ全体）。
FROM node:24-slim

# bcrypt / better-sqlite3 の prebuild が無い場合に備えてビルドツールを用意
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable
WORKDIR /repo

# 依存解決とビルド（api-spec → api-client → backend の順）
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @app/api-spec build \
  && pnpm --filter @app/api-client generate \
  && pnpm --filter @app/backend build

WORKDIR /repo/apps/backend
EXPOSE 3001
CMD ["node", "dist/main.js"]
