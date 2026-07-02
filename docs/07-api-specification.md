# API 仕様書

API の単一の真実（source of truth）は **TypeSpec**（`packages/api-spec/main.tsp`）。
そこから OpenAPI 3.1（`packages/api-spec/tsp-output/openapi.yaml`）と型/クライアント（`packages/api-client`）を生成する。

## 目次

- [エンドポイント一覧](#エンドポイント一覧)
  - [DryRun（検証のみ）エンドポイント](#dryrun検証のみエンドポイント)
  - [画像アップロード（タスク添付）](#画像アップロードタスク添付)
- [リクエスト / レスポンス形式](#リクエスト--レスポンス形式)
- [認証](#認証)
- [エラーハンドリング](#エラーハンドリング)
- [実行例（curl）](#実行例curl)
- [Swagger UI（対話的ドキュメント）](#swagger-ui対話的ドキュメント)
- [再生成コマンド](#再生成コマンド)


## エンドポイント一覧

| メソッド | パス | 概要 | 認証 |
|----------|------|------|------|
| POST | /auth/register | 新規登録 → AuthTokens(201) | 不要 |
| POST | /auth/register/validate | 登録の事前検証（DryRun）→ DryRunResult(200) | 不要 |
| POST | /auth/login | ログイン → AuthTokens | 不要 |
| POST | /auth/refresh | リフレッシュ → AuthTokens | リフレッシュトークン |
| POST | /auth/logout | ログアウト(204) | アクセストークン |
| GET | /tasks | 自分のタスク一覧 | アクセストークン |
| POST | /tasks | 作成 → Task(201) | アクセストークン |
| POST | /tasks/validate | 作成の事前検証（DryRun）→ DryRunResult(200) | アクセストークン |
| GET | /tasks/{id} | 詳細 | アクセストークン |
| PATCH | /tasks/{id} | 更新 | アクセストークン |
| POST | /tasks/{id}/validate | 更新の事前検証（DryRun）→ DryRunResult(200) | アクセストークン |
| DELETE | /tasks/{id} | 削除(204) | アクセストークン |
| POST | /tasks/{id}/image | 画像添付（multipart, field `file`）→ Task | アクセストークン |
| DELETE | /tasks/{id}/image | 添付画像の削除 → Task | アクセストークン |
| GET | /uploads/{file} | 添付画像の静的配信 | 不要 |
| GET | /health | 死活監視 | 不要 |

### DryRun（検証のみ）エンドポイント

`*/validate` は「保存する前に、入力がサーバ側の検証を通るか」を **DB に書き込まずに**確認する。

- 成功時: `200 DryRunResult { valid: true }`。
- 失敗時: 通常と同じ `ApiError`（400 バリデーション / 409 メール重複 / 403 非所有 / 404 不存在 / 401 未認証）。
- 実行する検証: DTO 検証（`ValidationPipe`）に加え、`register/validate` はメール重複、`tasks/{id}/validate` は所有権（404/403）。`tasks/validate`（作成）は DTO 検証のみ。
- ユーザー作成・トークン発行・タスク保存は一切行わない（後方互換: 既存エンドポイントは変更なし）。

### 画像アップロード（タスク添付）

- `POST /tasks/{id}/image` は **multipart/form-data**（フィールド名 `file`）で 1 枚を受け取り、保存後の `Task`（`imageUrl` 入り）を返す。MIME（png/jpeg/webp）・サイズ（≤2MB）違反は 400、非所有 403、不存在 404、未認証 401。
- `DELETE /tasks/{id}/image` は添付を外し、`imageUrl` の消えた `Task` を返す。
- 画像は `imageUrl`（例: `/uploads/<file>`）で参照し、`GET /uploads/<file>`（静的配信）で取得する。
- multipart は型安全クライアント（openapi-fetch）に不向きなため、フロントはこの 2 本のみ素の `fetch` + `FormData` で呼ぶ（Bearer は付与）。

## リクエスト / レスポンス形式

- 型定義は契約由来（`@app/api-client` の `Task` / `AuthTokens` / `TaskCreate` 等）。`imageUrl` は `Task` のみが持つ（`TaskCreate`/`TaskUpdate` には無い＝クライアントから直接書き換え不可）。
- リクエストの入力検証は backend 実装ごとに手法が異なる（外形は同一）: `backend-layered` / `backend-onion` は `class-validator` の DTO、`backend-clean` は **zod スキーマ + `ZodValidationPipe`**。いずれも違反は 400 `ApiError`（詳細は [docs/09](./09-architecture-specification.md#バックエンドのアーキ構成layered--clean)）。
- `url`（任意・関連 URL）は `Task` / `TaskCreate` / `TaskUpdate` が持つ。`http`/`https` のみ許可し（`@IsUrl`）、`javascript:`/`data:` 等の危険スキームや 2048 文字超は **400**。確認画面・詳細では安全なリンク（`target="_blank" rel="noopener noreferrer"`）として表示する。
- フロントの BFF（`/api/auth/*`）は上記 backend を呼び出し、リフレッシュトークンを Cookie 化する。

## 認証

- `Authorization: Bearer <accessToken>`。

## エラーハンドリング

- 形式: `ApiError { statusCode, message, error? }`。
- 主なコード: 400(バリデーション) / 401(認証) / 403(認可) / 404(不存在) / 409(重複登録)。

## 実行例（curl）

登録 → タスク作成までの最短例（backend が `:3001` で起動している前提。`jq` があるとトークン抽出が楽）。

```bash
# 1. 登録してアクセストークンを取得
ACCESS=$(curl -s -X POST http://localhost:3001/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@example.com","password":"password123","displayName":"demo"}' \
  | jq -r .accessToken)

# 2. タスク作成（Bearer を付与。startDate は必須・日付のみ）
curl -s -X POST http://localhost:3001/tasks \
  -H "Authorization: Bearer $ACCESS" \
  -H 'Content-Type: application/json' \
  -d '{"title":"はじめてのタスク","status":"todo","startDate":"2026-01-01"}' | jq

# 3. 自分のタスク一覧を取得
curl -s http://localhost:3001/tasks -H "Authorization: Bearer $ACCESS" | jq
```

> リフレッシュはブラウザの httpOnly Cookie 運用が前提のため、フロント経由での確認を推奨。Swagger UI（`/docs`）の "Try it out" でも一通り試せる。

## Swagger UI（対話的ドキュメント）

- backend 起動中に **http://localhost:3001/docs** で参照できる（"Try it out" 可）。
- 生スペックは **/docs-json**。
- UI は TypeSpec 生成物（`openapi.yaml`）をそのまま配信する＝**契約と完全一致**（コードから別 OpenAPI を作らない）。

## 再生成コマンド

```bash
pnpm api:gen   # TypeSpec → OpenAPI → 型/クライアント（Swagger UI もこの生成物を配信）
```
