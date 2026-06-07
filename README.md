# nuxtjs-nestjs-test-practice

Nuxt.js + NestJS のテスト practice プロジェクト（タスク管理アプリ）

## 概要

テストコードの知見を深めることを主目的とした学習用モノレポ。題材としてタスク管理アプリを、各層で「どんなテストを・なぜ書くか」を学べる構成で実装している。

- FE: Nuxt 3 (SPA) / TailwindCSS / Composable / Nitro BFF
- BE: NestJS / TypeORM / レイヤードアーキテクチャ / MySQL
- 契約: TypeSpec → OpenAPI → 型/クライアント生成（`packages/`）
- テスト: Jest / supertest / Vitest / MSW / Vue Test Utils / Playwright

## 主な機能

- 認証: 登録 / ログイン / リフレッシュ（ローテーション）/ ログアウト（JWT。アクセスはメモリ、リフレッシュは httpOnly Cookie）
- タスク CRUD: 所有者のみ操作可。状態（todo/in_progress/done）、期間（開始必須・終了任意、開始≤終了）
- 事前検証（DryRun）: 保存せず入力を検証する `*/validate` エンドポイント
- 画像添付: タスクに 1 枚（任意・png/jpeg/webp・2MB まで）。`/uploads` で静的配信、保存先は volume で永続化
- 契約から生成した Swagger UI（`/docs`）

詳細な仕様は `docs/` を参照。

## 構成

```
apps/backend    NestJS API
apps/frontend   Nuxt 3 SPA + Nitro BFF
packages/api-spec    TypeSpec 契約 → OpenAPI
packages/api-client  生成した型 + openapi-fetch クライアント
```

## セットアップ

```bash
pnpm install
cp .env.example .env
pnpm api:gen        # 契約から型を生成
```

> `make help` でよく使う操作の一覧を表示できます（`make up` / `make test` / `make gen` など）。

## 使い方

```bash
# DB だけ起動して個別に開発
pnpm db:up
pnpm --filter @app/backend dev
# 全部まとめて
docker compose up --build   # mysql + backend(:3001) + frontend(:3000)
```

主なアクセス先:

- アプリ UI: http://localhost:3000
- Swagger UI（対話的 API ドキュメント）: http://localhost:3001/docs

## テスト

```bash
pnpm --filter @app/backend test       # 単体(Jest)
pnpm --filter @app/backend test:e2e   # e2e(supertest / SQLite)
pnpm --filter @app/frontend test      # 単体(Vitest + MSW)
pnpm --filter @app/frontend test:e2e  # 全体E2E(Playwright)
```

## ドキュメント

仕様書は `docs/` 配下に管理。開発ルールは `.claude/rules/` を参照。
