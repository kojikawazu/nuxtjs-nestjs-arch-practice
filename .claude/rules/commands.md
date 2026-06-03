---
description: よく使うコマンド（pnpm workspaces / テスト / Docker）
globs:
---

# コマンド

## セットアップ / 生成

- `pnpm install` — 依存解決
- `pnpm api:gen` — TypeSpec → OpenAPI → 型/クライアント生成（FE/BE の前提）

## テスト

- `pnpm --filter @app/backend test` — BE 単体(Jest)
- `pnpm --filter @app/backend test:e2e` — BE e2e(supertest / SQLite)
- `pnpm --filter @app/frontend test` — FE 単体(Vitest)
- `pnpm --filter @app/frontend test:e2e` — 全体 E2E(Playwright, ビルド→起動→実行)

## 品質

- `pnpm lint` / `pnpm format:check`

## Docker

- `pnpm db:up` — MySQL のみ起動
- `docker compose up --build` — mysql + backend + frontend

> 注: backend e2e / Playwright は外部依存なしで動くよう SQLite を使う（`DB_TYPE=better-sqlite3`）。
