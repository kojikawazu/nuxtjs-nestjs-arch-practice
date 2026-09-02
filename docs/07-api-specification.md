# API 仕様書

API の単一の真実（source of truth）は **TypeSpec**（`packages/api-spec/main.tsp`）。
そこから OpenAPI 3.1（`packages/api-spec/tsp-output/openapi.yaml`）と型/クライアント（`packages/api-client`）を生成する。

## 目次

- [エンドポイント一覧](#エンドポイント一覧)
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
| POST | /auth/login | ログイン → AuthTokens | 不要 |
| POST | /auth/refresh | リフレッシュ → AuthTokens | リフレッシュトークン |
| POST | /auth/logout | ログアウト(204) | アクセストークン |
| GET | /tasks | 自分のタスク一覧 | アクセストークン |
| POST | /tasks | 作成 → Task(201) | アクセストークン |
| GET | /tasks/{id} | 詳細 | アクセストークン |
| PATCH | /tasks/{id} | 更新 | アクセストークン |
| DELETE | /tasks/{id} | 削除(204) | アクセストークン |
| POST | /tasks/{id}/image | 画像添付（multipart, field `file`）→ Task | アクセストークン |
| DELETE | /tasks/{id}/image | 添付画像の削除 → Task | アクセストークン |
| GET | /uploads/{file} | 添付画像の静的配信 | 不要 |
| GET | /health | 死活監視 | 不要 |

> **DryRun（`*/validate`）は廃止した**。保存せず事前検証する専用エンドポイントを 3 本持っていたが、
> 本登録（`POST` / `PATCH`）が同じ検証を通しており重複していたため削除した。
> 業務ルール違反はいずれも本登録の実行時に返る（開始 > 終了は 422、メール重複は 409、非所有は 403、不存在は 404）。
> サーバ側の検証実体は `application/validators/` の Validator に集約されている（[docs/09](./09-architecture-specification.md)）。

### 画像アップロード（タスク添付）

- `POST /tasks/{id}/image` は **multipart/form-data**（フィールド名 `file`）で 1 枚を受け取り、保存後の `Task`（`imageUrl` 入り）を返す。
  - MIME（png/jpeg/webp）違反・ファイル無しは **422**（`errors[].field` は `file`）。
  - **サイズ超過は 413**（Multer が受信段階で止める）。上限はサーバ設定 `MAX_UPLOAD_BYTES`（既定 2MB）で、ハードコードではない。
  - 非所有 403、不存在 404、未認証 401。
- `DELETE /tasks/{id}/image` は添付を外し、`imageUrl` の消えた `Task` を返す。
- 画像は `imageUrl`（例: `/uploads/<file>`）で参照し、`GET /uploads/<file>`（静的配信）で取得する。
- multipart は型安全クライアント（openapi-fetch）に不向きなため、フロントはこの 2 本のみ素の `fetch` + `FormData` で呼ぶ（Bearer は付与）。

## リクエスト / レスポンス形式

- 型定義は契約由来（`@app/api-client` の `Task` / `AuthTokens` / `TaskCreate` 等）。`imageUrl` は `Task` のみが持つ（`TaskCreate`/`TaskUpdate` には無い＝クライアントから直接書き換え不可）。
- リクエストの入力検証は全 backend 版で **zod スキーマ + ルート単位 `ZodValidationPipe`** に統一（`presentation/dto/` のスキーマ・`.strict()` で未知キー拒否・グローバル `ValidationPipe` は不使用）。違反は **422** `ApiError`（詳細は [docs/09](./09-architecture-specification.md#バックエンドのアーキ構成layered--clean)）。
- `url`（任意・関連 URL）は `Task` / `TaskCreate` / `TaskUpdate` が持つ。`http`/`https` のみ許可し（zod `refine(isHttpUrl)`）、`javascript:`/`data:` 等の危険スキームや 2048 文字超は **422**。確認画面・詳細では安全なリンク（`target="_blank" rel="noopener noreferrer"`）として表示する。
- フロントの BFF（`/api/auth/*`）は上記 backend を呼び出し、リフレッシュトークンを Cookie 化する。

## フロント BFF（Nitro）エンドポイント

backend の契約とは別に、Nuxt の Nitro が持つ内部 API。ブラウザからのみ呼ばれ、backend へは中継する。

| エンドポイント | 実装 | 用途 |
|---|---|---|
| `POST /api/auth/*` | 両 frontend | ログイン・登録・リフレッシュ・ログアウト。refresh を httpOnly Cookie 化 |
| `POST /api/tasks/draft` | `frontend-ssr` のみ | タスク新規作成の入力内容を httpOnly Cookie `task_draft` に保存。形式不正は 400、Cookie 上限超過は **413**。業務ルールの検証は本登録（`POST /tasks`）が担うため backend へは中継しない |
| `GET /api/tasks/draft` | `frontend-ssr` のみ | 保存済み draft を返す（`{ draft: TaskDraft \| null }`）。httpOnly のためクライアント JS からは直接読めず、確認画面が SSR 中に `useRequestFetch()` で呼ぶ |
| `DELETE /api/tasks/draft` | `frontend-ssr` のみ | draft を破棄（タスク作成完了時） |

## 認証

- `Authorization: Bearer <accessToken>`。

## エラーハンドリング

- 形式: `ApiError { statusCode, message, error?, errors? }`。
- 主なコード: **422(検証失敗)** / 401(認証) / 403(認可) / 404(不存在) / 409(重複登録) / **413(受け取れないほど大きい: 画像の上限超過・draft Cookie 上限)**。
- **400 / 413 / 422 の使い分け**: 400 は「構文が壊れている」（JSON として読めない等）、413 は「大きすぎて受け取れない」、422 は「構文は正しいが意味的に処理できない」。zod の形式検証・業務ルール違反（開始 > 終了）・画像の MIME 違反は 422、画像のサイズ超過だけは受信段階で止めるため **413**。
- **409（重複登録）の経路は 2 つ**: 事前確認（`findByEmail`）で見つかる通常経路と、**並行登録で DB の一意制約に当たる経路**。後者を翻訳していないと、同一メールの同時登録で片方が 500 になる（仕様上は 409）。一意制約違反だけを 409 に写し、それ以外の DB エラーは翻訳せず 500 のままにする（DB 障害を「メール重複」に見せない）。
- **`errors`（フィールド別の理由）**: 422 のときだけ付く `ValidationError[]`。`message` は全件を連結した人間向けの一文で、`errors` は UI がフィールドへ割り付けるための構造。両者は併存し、`message` は従来どおり必ず入る。

```jsonc
// POST /tasks に { "title": "", "startDate": "2026-06-15T00:00:00.000Z", "endDate": "2026-06-10T00:00:00.000Z" }
{
  "statusCode": 422,
  "message": "title: 1文字以上入力してください",
  "errors": [{ "field": "title", "messages": ["1文字以上入力してください"] }]
}
```

- `field` は契約のフィールド名（`title` / `endDate` / 画像は `file`）。どのフィールドにも紐づかない理由は `"_"` に入る。
- 業務ルール違反も `errors` を持つ（開始 > 終了は `field: "endDate"`）。clean / onion は `DomainError.fields` を例外フィルタが展開し、layered は `UnprocessableEntityException` に直接載せる。
- フロントは `utils/fieldErrors.ts` の `getFieldErrors()` で取り出し、`TaskForm` の各入力欄の下（`data-testid="error-*"`）へ表示する。表示先の無いフィールドは無視し、代わりにページ側が `message` を全文表示する。
- **契約上の注意**: `errors` はマップ（`Record<string, string[]>`）ではなく配列。TypeSpec の OpenAPI 3.1 出力が動的キーを `unevaluatedProperties` で表現し、`openapi-typescript` がそれを解釈できず `Record<string, never>` に落ちるため、配列で表現している。

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
