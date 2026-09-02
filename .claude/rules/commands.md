---
description: よく使うコマンド（pnpm workspaces / テスト / Docker）
globs:
---

# コマンド

> ショートカットとして **`make <target>`** も利用可（`make help` で一覧）。下記は実体の pnpm/docker コマンド。

## セットアップ / 生成

- `pnpm install` — 依存解決
- `pnpm api:gen` — TypeSpec → OpenAPI → 型/クライアント生成（FE/BE の前提）

## テスト

- `pnpm --filter @app/backend-layered test` — BE 単体(Jest)
- `pnpm --filter @app/backend-layered test:e2e` — BE e2e(supertest / in-memory SQLite)
- `pnpm --filter @app/backend-layered test:it` — BE IT(DB 忠実性 / MySQL コンテナ必須。`make test-back-it` が 3 版まとめて実行)
- `pnpm --filter @app/frontend-spa test` — FE 単体(Vitest)
- `pnpm --filter @app/frontend-spa test:e2e` — 全体 E2E(Playwright, ビルド→起動→実行 / SQLite)
- `make test-scenario-mysql` — 通しシナリオ(FE+BE を MySQL コンテナに繋いで実行。本番相当の出荷ゲート)

## 品質

- `pnpm lint` / `pnpm format:check`
- `pnpm lint:md` — Markdown の Lint（markdownlint-cli2。設定と無効化の理由は `.markdownlint-cli2.yaml`）
- `pnpm lint:workflows` — GitHub Actions ワークフローの Lint（actionlint。**Docker 必須**・shellcheck 同梱の公式イメージをタグ固定で使う）

> 上記 2 つは CI（`ci.yml` の `actionlint` / `docs` ジョブ）でも**同じコマンド**を呼ぶ。
> コマンドの定義は `package.json` の 1 箇所だけに置き、手元と CI を乖離させない（[github-actions.md](./github-actions.md)）。

## Docker

- `pnpm db:up` — MySQL のみ起動
- `docker compose up --build` — mysql + backend + frontend

> 注: backend e2e / Playwright は外部依存なしで速く回すため SQLite を使う（`DB_TYPE=better-sqlite3`）。
> **IT とシナリオだけは MySQL コンテナ（`docker compose --profile test up -d --wait mysql-test`）を前提とする** — SQLite では検出できない本番 DB 固有の挙動（照合順序・unique 制約）を担保する層のため。IT は `taskdb_it`、シナリオは `taskdb_e2e` を使う。
