# コードリーディングガイド

このドキュメントは、本モノレポ（Nuxt 3 フロント + NestJS バックエンド + TypeSpec 契約）を初めて読む人のためのナビゲーションガイド。**契約 → バックエンド → フロントエンド → テスト** の順に、どのファイルを・どこに注目して読むかを示す。

---

## 構成（パッケージ / レイヤー）の対比

| 領域 | ディレクトリ | 役割 | 主な技術 |
|---|---|---|---|
| 契約 | `packages/api-spec/` | API の単一の真実（source of truth） | TypeSpec → OpenAPI |
| 生成物 | `packages/api-client/` | 契約から生成した型 + 型安全クライアント | openapi-typescript / openapi-fetch |
| バックエンド | `apps/backend/` | レイヤード（presentation / application / infrastructure） | NestJS / TypeORM |
| フロントエンド | `apps/frontend/` | SPA + Nitro BFF。副作用は Composable に集約 | Nuxt 3 / Tailwind |

> **読み始める前に**: `pnpm api:gen` を実行しておくと、`packages/api-client/src/generated/` に型が生成され、FE/BE 双方の `@app/api-client` import が解決できる（生成物は `.gitignore` 対象）。

---

## 読む順番（推奨）

### Step 1: 契約から全体像を把握する

「どんなエンドポイントが・どんな型でやり取りされるか」は契約に全部書いてある。ここを最初に読むと FE/BE の型の出どころが分かる。

```
packages/api-spec/main.tsp          # エンドポイント・モデル定義（唯一の真実）
packages/api-client/src/index.ts    # 生成型の再エクスポート（@app/api-client の入口）
packages/api-client/src/client.ts   # openapi-fetch ベースの型安全クライアント生成
```

読むポイント:

- `main.tsp` の `namespace Auth` / `namespace Tasks` がそのまま `/auth/*` `/tasks/*` のエンドポイント群。
- `model Task` / `model TaskCreate` / `model TaskUpdate` の差分に注目。`imageUrl` は `Task`（レスポンス）にだけあり、`TaskCreate/Update` には無い＝クライアントから直接設定できない読み取り専用フィールド。
- 画像添付は `multipart/form-data`（`op uploadImage`）。`DryRun` は `*/validate` で `DryRunResult` を返す。
- ここから `pnpm api:gen` で `openapi.yaml` → `@app/api-client` の型が生成され、FE/BE が `import type` で共有する。

> **差分ポイント**: コードから OpenAPI を作るのではなく、**TypeSpec から型もクライアントも Swagger UI も生成**する。だから「契約と実装がズレない」。

---

### Step 2: 認証の仕組みを読む

認証はアプリ全体の根幹。トークンが「どこで作られ・どこに保管され・どう検証されるか」を押さえる。

**バックエンド（JWT 発行・検証）**

| ファイル | 役割 |
|---|---|
| `apps/backend/src/modules/auth/auth.controller.ts` | register / login / refresh / logout の入口 |
| `apps/backend/src/modules/auth/auth.service.ts` | パスワード照合・トークン発行・**リフレッシュトークンのローテーション** |
| `apps/backend/src/modules/auth/strategies/jwt-access.strategy.ts` | アクセストークン（Bearer）の検証 |
| `apps/backend/src/modules/auth/guards/jwt-auth.guard.ts` | 保護ルートに付ける認証ガード |
| `apps/backend/src/modules/auth/entities/refresh-token.entity.ts` | リフレッシュトークンのハッシュ保存 |
| `apps/backend/src/common/decorators/current-user.decorator.ts` | `@CurrentUser()` で認証済みユーザーを取得 |

読むポイント:

- パスワードは bcrypt、リフレッシュトークンは SHA-256 + `timingSafeEqual`（`auth.service.ts`）。
- リフレッシュ時に旧トークン行を削除して再発行する（ローテーション）。`jti` で同一秒でも一意化。
- `@UseGuards(JwtAuthGuard)` が付くコントローラーは要認証（例: `tasks.controller.ts`）。

**フロントエンド（メモリ + httpOnly Cookie の二層）**

| ファイル | 役割 |
|---|---|
| `apps/frontend/composables/useAuthState.ts` | アクセストークン・ユーザーを `useState`（メモリ）で保持 |
| `apps/frontend/composables/useAuth.ts` | register / login / refresh / logout のユースケース |
| `apps/frontend/server/api/auth/*.post.ts` | **Nitro BFF**。backend を呼び、refresh を httpOnly Cookie 化 |
| `apps/frontend/server/utils/auth-bff.ts` | BFF 共通処理（Cookie 設定・backend 呼び出し） |
| `apps/frontend/middleware/auth.global.ts` | 未認証で保護ページに来たら `/login` へ |
| `apps/frontend/plugins/auth-init.client.ts` | リロード後にサイレント更新でセッション復元 |

読むポイント:

- **アクセストークンはメモリ（`useState`）のみ**。localStorage に置かない。
- **リフレッシュトークンは BFF が httpOnly Cookie で扱う**ので JS から読めない。リロード時は `plugins/auth-init.client.ts` がサイレント更新で復元する。

> **差分ポイント**: ブラウザは「タスク系 API は backend に Bearer 直送」「auth 系は BFF 経由」。BFF だけが refresh Cookie を知っている。

---

### Step 3: データモデルを読む

```
apps/backend/src/modules/users/user.entity.ts            # User
apps/backend/src/modules/tasks/task.entity.ts            # Task（User に紐づく）
apps/backend/src/modules/auth/entities/refresh-token.entity.ts  # RefreshToken
```

**関連図**

```
User
 ├── has many Task          (userId で所有)
 └── has many RefreshToken  (tokenHash を保存)
```

読むポイント:

- カラム型は MySQL / SQLite 双方で動く**ポータブル型のみ**（`varchar` / `text` / `datetime`）。`status` は enum カラムにせず `varchar` + 契約型 `TaskStatus` + DTO バリデーションで担保。
- `Task.imageUrl` は `varchar(512)` nullable。実体はファイルシステム、DB には公開パスだけ。
- エンティティ（DB 形）と契約型 `Task`（API 形）は別物。変換は `tasks.service.ts` の `toContractTask` が担う。

---

### Step 4: バックエンドのレイヤードを読む（tasks を例に）

リクエストの流れ: **Controller(presentation) → Service(application) → Repository/Entity(infrastructure)**。

```
apps/backend/src/modules/tasks/tasks.controller.ts   # HTTP 入口・DTO 受け・@CurrentUser
apps/backend/src/modules/tasks/dto/*.dto.ts          # class-validator で入力検証（契約型を implements）
apps/backend/src/modules/tasks/tasks.service.ts      # 認可・業務ルール・トークン回転などの本体
apps/backend/src/main.ts                             # ValidationPipe / 例外フィルタ / 静的配信の起動設定
apps/backend/src/common/filters/http-exception.filter.ts  # 例外を契約 ApiError 形に統一
apps/backend/src/config/static-assets.ts             # /uploads 静的配信（画像）
```

読むポイント:

- **ビジネスロジックは Service に集約**。Controller は受けて Service に渡すだけ。
- 認可: `tasks.service.ts` の `findOwned` が「存在しない=404 / 非所有=403」を区別。
- 日付: `startDate` 必須・`endDate` 任意・`startDate ≤ endDate`（`assertDateOrder`）。
- DryRun: `validateCreate` / `validateUpdate` は検証だけして **`save` を呼ばない**（保存しないことがテストで保証される）。
- 画像: `setImage` がサーバ生成 uuid 名で保存し旧ファイルを掃除。MIME/サイズ検証は Controller の `ParseFilePipe`。
- DTO は `implements TaskCreate`（`@app/api-client`）で契約とのズレを型で検出する。

> **差分ポイント**: 例外は投げっぱなしにせず `AllExceptionsFilter` が `ApiError { statusCode, message }` に統一する。内部情報を漏らさない。

---

### Step 5: フロントエンドを読む

「副作用（HTTP・状態）は Composable に閉じ込め、コンポーネントは表示に専念」が設計の軸。

```
apps/frontend/composables/useApiClient.ts   # 生成クライアントにアクセストークンを注入
apps/frontend/composables/useTasks.ts        # タスク CRUD・DryRun・画像 API のユースケース
apps/frontend/pages/tasks/index.vue          # 一覧
apps/frontend/pages/tasks/new.vue            # 新規作成（フォーム → 確認の2段階）
apps/frontend/pages/tasks/[id]/index.vue     # 詳細
apps/frontend/pages/tasks/[id]/edit.vue      # 編集
apps/frontend/components/TaskForm.vue        # 入力フォーム + クライアント検証 + 画像プレビュー
```

読むポイント:

- `useTasks.ts`: タスク系は生成クライアント（`useApiClient`）経由。**画像 multipart だけは openapi-fetch が不向きなので素の `fetch` + Bearer**。
- `new.vue` / `edit.vue`: 「フォーム → 確認(confirm)」の2段階。確認に進んだ時点でサーバ側 DryRun 検証が走り、通過するまで確定ボタンを無効化。画像は本体作成/更新の**後に**別経路でアップロード。
- `TaskForm.vue`: コンポーネントは表示と入力検証のみ。HTTP は持たず、選択ファイルや値を `submit` で親（ページ）に emit する。

---

### Step 6: テストを読む

テストはコードの「仕様書」。実装より先にテストを読むと意図が分かりやすい。**モックは外部 I/O（DB・HTTP・fs）のみ**で、ビジネスロジックはモックしない。

| 層 | ファイル | モック対象 |
|---|---|---|
| BE Service 単体 | `apps/backend/src/modules/**/**.spec.ts` | Repository(DB) と fs のみ |
| BE e2e | `apps/backend/test/*.e2e-spec.ts` | なし（in-memory SQLite + supertest） |
| BE e2e 基盤 | `apps/backend/test/test-app.factory.ts` | DB を `:memory:`、画像を一時ディレクトリに隔離 |
| FE Composable (`useTasks`) | `apps/frontend/tests/unit/useTasks.spec.ts` | backend への HTTP を **MSW** |
| FE Composable (`useAuth`) | `apps/frontend/tests/unit/useAuth.spec.ts` | Nitro BFF を `registerEndpoint` |
| FE Component | `apps/frontend/tests/unit/TaskForm.spec.ts` | flatpickr を `vi.mock` |
| MSW セットアップ | `apps/frontend/tests/setup/msw.ts` | — |
| 全体 E2E | `apps/frontend/tests/e2e/task-flow.spec.ts` | なし（実スタック / Playwright） |

読むポイント:

- DryRun テストは「`users.create`/`tasks.save` が**呼ばれない**こと」をアサートして、書き込みが起きないことを保証する。
- e2e は `test-app.factory.ts` の `createTestApp` が SQLite と `/uploads` 静的配信を本番と同じ経路で立てる。
- 比率は「正常系 1 : 異常系（準正常系 + 異常系）2 以上」を目安にしている。

---

## 重要な観点まとめ

| 観点 | 実装 | 関連ファイル |
|---|---|---|
| **型の源泉** | TypeSpec 契約 → 生成型を FE/BE で共有 | `packages/api-spec/main.tsp` |
| **アクセストークンの保管** | メモリ（`useState`）のみ | `composables/useAuthState.ts` |
| **リフレッシュトークンの保管** | httpOnly Cookie（BFF 管理） | `server/api/auth/*`, `server/utils/auth-bff.ts` |
| **認可（所有者チェック）** | 存在=404 / 非所有=403 | `tasks.service.ts` の `findOwned` |
| **未認証時** | 401（`ApiError`） | `guards/jwt-auth.guard.ts`, `http-exception.filter.ts` |
| **削除後** | 204（ボディなし） | `tasks.controller.ts` の `@HttpCode(204)` |
| **入力検証** | DTO（class-validator）+ ValidationPipe | `modules/**/dto/*.dto.ts`, `main.ts` |
| **保存せず検証（DryRun）** | `*/validate` で `save` を呼ばない | `tasks.service.ts`, `auth.service.ts` |
| **画像保存** | FS + volume、DB はパスのみ | `tasks.service.ts`, `config/static-assets.ts` |
| **テストのモック方針** | 外部 I/O のみ（DB/HTTP/fs） | 各 `*.spec.ts` |

---

## 動作確認コマンド

### セットアップ

```bash
pnpm install
pnpm api:gen        # 契約から型/クライアントを生成（FE/BE の前提）
```

### 起動

```bash
# 個別（backend は SQLite で Docker 不要）
DB_TYPE=better-sqlite3 DB_DATABASE=:memory: pnpm --filter @app/backend dev
pnpm --filter @app/frontend dev
# まとめて（MySQL + backend + frontend）
docker compose up --build
```

- アプリ UI: http://localhost:3000
- Swagger UI（契約と完全一致の対話的ドキュメント）: http://localhost:3001/docs

### API を直接叩く（curl）

```bash
# 登録 → accessToken を取得
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","displayName":"テスト"}'

# タスク一覧（token を置き換える）
curl http://localhost:3001/tasks -H "Authorization: Bearer <token>"

# タスク作成
curl -X POST http://localhost:3001/tasks \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"title":"牛乳を買う","startDate":"2026-06-10T00:00:00.000Z"}'
```

### テスト実行

```bash
pnpm --filter @app/backend test       # BE 単体(Jest)
pnpm --filter @app/backend test:e2e   # BE e2e(supertest / SQLite)
pnpm --filter @app/frontend test      # FE 単体(Vitest + MSW)
pnpm --filter @app/frontend test:e2e  # 全体 E2E(Playwright, ビルド→起動→実行)
```

> これらは GitHub Actions（`.github/workflows/ci.yml`）で PR・`main` push 時に自動実行される。
