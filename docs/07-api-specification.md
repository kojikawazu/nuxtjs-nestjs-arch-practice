# API 仕様書

API の単一の真実（source of truth）は **TypeSpec**（`packages/api-spec/main.tsp`）。
そこから OpenAPI 3.1（`packages/api-spec/tsp-output/openapi.yaml`）と型/クライアント（`packages/api-client`）を生成する。

## エンドポイント一覧

| メソッド | パス | 概要 | 認証 |
|----------|------|------|------|
| POST | /auth/register | 新規登録 → AuthTokens(201) | 不要 |
| POST | /auth/login | ログイン → AuthTokens | 不要 |
| POST | /auth/refresh | リフレッシュ → AuthTokens | リフレッシュトークン |
| POST | /auth/logout | ログアウト(204) | アクセストークン |
| GET | /tasks | 自分のタスク一覧 | アクセストークン |
| POST | /tasks | 作成 → Task(201) | アクセストークン |
| GET | /tasks/{id} | 詳細 | アクセストークン |
| PATCH | /tasks/{id} | 更新 | アクセストークン |
| DELETE | /tasks/{id} | 削除(204) | アクセストークン |
| GET | /health | 死活監視 | 不要 |

## リクエスト / レスポンス形式

- 型定義は契約由来（`@app/api-client` の `Task` / `AuthTokens` / `TaskCreate` 等）。
- フロントの BFF（`/api/auth/*`）は上記 backend を呼び出し、リフレッシュトークンを Cookie 化する。

## 認証

- `Authorization: Bearer <accessToken>`。

## エラーハンドリング

- 形式: `ApiError { statusCode, message, error? }`。
- 主なコード: 400(バリデーション) / 401(認証) / 403(認可) / 404(不存在) / 409(重複登録)。

## 再生成コマンド

```bash
pnpm api:gen   # TypeSpec → OpenAPI → 型/クライアント
```
