# タスク

開発フェーズの進捗を管理する。

## 目次

- [マイルストーン / 進捗](#マイルストーン--進捗)
- [テスト集計](#テスト集計)
- [CI](#ci)
- [今後の候補（未着手）](#今後の候補未着手)

## マイルストーン / 進捗

| # | フェーズ | 状態 | 主な成果 |
|---|---------|------|---------|
| 0 | モノレポ基盤 | ✅ | pnpm workspaces / tsconfig / ESLint・Prettier / compose(MySQL) |
| 1 | API 契約 | ✅ | TypeSpec → OpenAPI → 型/クライアント |
| 2 | バックエンド | ✅ | NestJS レイヤード / JWT / tasks CRUD / Jest 単体19・e2e11 |
| 3 | フロントエンド | ✅ | Nuxt3 SPA / Composable / Nitro BFF / Vitest 13 |
| 4 | 全体 E2E | ✅ | Playwright(chromium) 通しシナリオ 2 |
| 5 | Docker統合・docs | ✅ | Dockerfile×2 / compose 結線 / 仕様書追記 / rules 同期 |
| 6 | DryRun（検証のみ） | ✅ | `*/validate` 3本（register/tasks作成/tasks更新）/ 契約→FE/BE / confirm 自動検証・登録検証ボタン |
| 7 | 期間（開始/終了）+ flatpickr | ✅ | dueDate→startDate(必須)/endDate(任意) / 開始≤終了の検証 / flatpickr 2入力 |
| 8 | 画像アップロード（1枚・任意） | ✅ | 契約 `imageUrl`+`*/image` 2本 / multer+useStaticAssets(/uploads) / FS+volume / FE 2ステップ・プレビュー |
| 9 | CI（GitHub Actions） | ✅ | PR/main push で lint・format・typecheck・BE単体/e2e・FE単体・E2E(Playwright) を自動実行 |
| 10 | 関連 URL + 安全なリンクプレビュー | ✅ | 契約 `url` / `@IsUrl`(http/https) / `UrlPreview`(描画時ガード+rel=noopener) / 確認画面・詳細でプレビュー |
| 11 | アーキ比較: アプリ複数化 | ✅ | 既存を `backend-layered`/`frontend-spa` にリネーム → `backend-clean`（Port で依存性逆転）→ `backend-onion`（契約をドメイン中核が所有 + ドメインサービス）→ `frontend-ssr`（SSR + サーバ側セッション復元）を追加。CI を matrix 化（backend 3 版 / frontend 2 版）。選定指針を docs/09 に整備 |
| 12 | アーキ比較: 読み取り分離（CQRS-lite） | ✅ | clean/onion の tasks 読み取り（list/get）を `queries/` + 読み取り専用 `TaskQuery` Port に分離（ORM→契約 直射影・domain 非経由）。layered は分離せず baseline。HTTP 契約・e2e は不変。docs/09 に CQRS 節を追記 |
| 13 | アーキ比較: clean の application/presentation 細分化 + 機能スライス化 | ✅ | clean のみ `application/inputs`（Command 型＋契約→Input 変換で presentation 依存逆流を解消）/ `read-models`（Read Model を application が所有）/ `validators`（DryRun 集約）/ `query-services`（旧 queries 改名）/ `presentation/guards`（auth の JwtAuthGuard 再エクスポート）を追加。さらに `src/modules/` → **`src/api/{tasks,auth,users}/`**（機能スライス）へリネーム。`forms`/`models`/`schemas`/`resolves`/`interceptors`/`middlewares` は REST+契約駆動では二重管理/不要のため意図的に非採用。HTTP 契約・e2e は不変。layered=baseline / onion=据え置き（`src/modules/` のまま） |
| 14 | アーキ比較: clean の auth/users もクリーン化 | ✅ | clean の auth/users を tasks と同じ domain/application/infrastructure/presentation に再構成。外部 I/O を全 Port 化（UserRepository / PasswordHasher / TokenIssuer / RefreshTokenRepository）し、太い AuthService を register/login/refresh/logout の 4 ユースケース＋ register validator へ分解。`DomainError` に conflict(409)/unauthorized(401) を追加し auth も DomainError 化。HTTP 契約・e2e は不変。layered / onion の auth/users は従来レイヤードのまま |
| 15 | 検証比較: clean/spa に zod 導入 | ✅ | `backend-clean` の入力検証を class-validator → **zod**（`presentation/dto/` スキーマ + ルート単位 `ZodValidationPipe`）に置換。グローバル `ValidationPipe` 廃止・`.strict()` で未知キー拒否・`satisfies z.ZodType<契約>` で契約ドリフト型検出。`frontend-spa` はフォーム検証（`utils/taskFormSchema.ts`）と backend レスポンスのランタイム検証（`utils/taskSchema.ts`）に zod 採用。layered/onion・frontend-ssr は従来手法のまま（検証手法の比較例）。HTTP 契約・e2e/E2E は不変 |
| 16 | 検証統一: 全アプリ zod 化 | ✅ | clean/spa で導入した zod を横展開。`backend-onion` / `backend-layered` の入力検証を class-validator → **zod**（ルート単位 `ZodValidationPipe` + `presentation/dto/` スキーマ・`.strict()`・`satisfies z.ZodType<契約型>`）に置換し、グローバル `ValidationPipe`・class-validator/class-transformer/@nestjs/mapped-types を廃止。`frontend-ssr` にフォーム検証（`taskFormSchema`）＋レスポンスのランタイム検証（`taskSchema` を `useTasks` で `parse`）を導入（裸キャストに実行時検証を追加）。これで **5 アプリすべてが zod に統一**（検証手法の比較軸は解消し、backend はアーキ差・frontend はレンダリング差のみに純化）。HTTP 契約・e2e/E2E は不変 |
| 17 | アーキ比較: onion の auth/users もクリーン化 | ✅ | onion の auth/users を fat `AuthService`/`UsersService` から tasks と同じクリーン構成へ移行。外部 I/O を全 Port 化（UserRepository / PasswordHasher / TokenIssuer / RefreshTokenRepository）し、太い `AuthService` を register/login/refresh/logout の 4 ユースケース＋ register validator に分解。`DomainErrorKind` に conflict(409)/unauthorized(401) を追加し auth も DomainError 化。契約は onion 流に `domain/repositories/` `domain/services/` が所有（clean は `application/ports/`）。**これで clean/onion とも tasks・auth/users が全クリーン化**（layered のみ baseline）。HTTP 契約・e2e は不変（単体 58→69） |
| 18 | レンダリング比較: SSR 確認画面 | ✅ | `frontend-ssr` のタスク新規作成の確認画面を、同一ページ内 step 切替から**独立ルート `/tasks/new/confirm` のサーバ描画**へ移行。draft を Nitro BFF の httpOnly Cookie（`task_draft`・30分）に保持し、確認画面は `useRequestFetch()` でサーバ実行して初回 HTML に内容を載せる。DryRun 検証を遷移前に BFF へ移し、確認画面から「検証中/未検証」の中間状態を排除。Cookie 上限（3500バイト・**エンコード後**で判定）はクライアント（入力中のインライン警告・submit ブロック）とサーバ（413・最終防御）で同一基準を共有（`utils/draftSize.ts`）。画像（File）は Cookie に載らないため `useState` + `<ClientOnly>` でクライアント保持。`frontend-spa` は CSR step 切替のまま据え置き（比較軸）。編集フローは対象外。`data-testid` 維持により既存 `task-flow.spec.ts` は無改修で通る |
| 19 | レンダリング比較: CSR 確認画面（sessionStorage） | ✅ | `frontend-spa` の確認画面を同一ページ内 step 切替から**独立ルート `/tasks/new/confirm`** へ移行し、draft を **sessionStorage** に保持（`composables/useTaskDraft.ts` + `utils/taskDraftSchema.ts` で読み出し時に zod 検証）。ルート構成・遷移前 DryRun 検証・画像のメモリ保持を SSR 版と揃え、**差を「draft をどこに置くか」の一点に絞った**。結果として Cookie 版のサイズ上限（`payloadByteLimit`）は不要になる一方、sessionStorage 版は**タブ単位で別タブでは復元不可**・**JS から読めるため XSS に弱い**という別の制約を持つ。既存 `task-flow.spec.ts` は `data-testid` 維持により無改修で通る |
| 20 | Codex 向けルール導線 | ✅ | `.claude/rules/` を唯一の正本として維持したまま、ルートと各アプリ／パッケージに階層型 `AGENTS.md` を追加。Codex は変更対象に応じた共通・スタック別規約を自動参照し、ルール構成の変更時だけ `CLAUDE.md`・`AGENTS.md`・README を同期する。 |
| 21 | clean: shared 境界の明確化 | ✅ | `backend-clean` の feature 非依存な基盤を `src/shared/`（DomainError 基底、共通 HTTP 例外フィルタ、Zod Pipe、形式検証 helper）へ集約。Task / Auth / User 固有のエラー・業務ルール・DTO・Port・Entity・Repository 実装は、再利用されても `src/api/{feature}/` に維持する境界を規約と設計書へ明記。 |
| 22 | onion: shared 境界の明確化 | ✅ | `backend-onion` の feature / domain 契約に非依存な基盤を `src/shared/`（DomainError 基底、共通 HTTP 例外フィルタ、Zod Pipe、形式検証 helper）へ集約。Task / Auth / User 固有のエラー・業務ルール・DTO・domain の Port / Service・Entity・Repository 実装は、再利用されても `src/modules/{feature}/` に維持する境界を規約と設計書へ明記。 |
| 23 | 学習用語集の拡張 | ✅ | `docs/10` の用語集を Vue / Nuxt、API / backend 共通、アーキテクチャ比較、テストの4分類へ拡張。各用語に実装ファイルへのリンクを添え、Clean / Onion の Port 所有・`shared/` 境界・CQRS-lite とテストレベルの使い分けをコードリーディングの入口として説明。 |
| 24 | 検証の集約と DryRun 廃止 | ✅ | clean/onion の業務ルール検証を `application/validators/` の Validator に集約し、UseCase が注入して呼ぶ形に統一（Validator は検証済みドメイン `NewTask` / `Task` を返すため、更新系は DB read 1 回で済む）。あわせて本登録と重複していた **DryRun 用 `*/validate` 3 本を契約ごと廃止**し、FE の確認画面フロー（遷移前検証・登録の「検証」ボタン・更新の `!validated` ガード）を撤去。検証は「FE zod で即時フィードバック → 本登録でサーバ判定」の 2 段に整理された。e2e は 3 版とも `*/validate` が **404** になることを検証する。layered は従来レイヤードの比較軸として Validator 集約の対象外（DryRun 用 UseCase は呼び出し元を失うため削除） |
| 25 | 検証失敗を 422 + フィールド別エラーで返す | ✅ | 入力検証の失敗を 400 → **422** に変更し、契約 `ApiError` に `errors`（`{ field, messages }[]`）を追加。zod の形式検証・業務ルール違反（開始 > 終了）・画像の MIME/サイズ/欠落をすべて 422 に揃え、どのフィールドが何の理由で弾かれたかを構造で返す。clean / onion は `DomainError.fields` を例外フィルタが展開（`endDate` 等はドメインエンティティ自身の属性名なので依存は内向きのまま）、layered は例外に直接載せる。FE は `utils/fieldErrors.ts` の `getFieldErrors()` で取り出し、`TaskForm` の既存のインライン表示へ流す（作成フローは確認画面に入力欄が無いため、422 を受けたら入力画面へ差し戻す）。`errors` をマップでなく配列にしたのは、TypeSpec の OpenAPI 3.1 出力が動的キーを `unevaluatedProperties` で表現し `openapi-typescript` が解釈できない（`Record<string, never>` に落ちる）ため。409 / 404 / 403 / 401 は不変 |
| 26 | onion: application の presentation 依存を解消 | ✅ | onion tasks の `application/` が `presentation/dto/` を import していた 4 箇所（usecase 2 + validator 2）を、`application/inputs/`（`CreateTaskInput` / `UpdateTaskInput` ＋ 契約→Input 変換）を挟んで解消。変換関数の引数は DTO 型ではなく**契約型**（`TaskCreate` / `TaskUpdate`）にすることで、presentation・application のどちらからも等距離な `@app/api-client` を共通語彙にし、依存を内向きに揃えた。ISO 文字列 → `Date` の正規化も境界に移動。clean tasks・onion auth と同じ形になり、**3 版とも application → presentation の import は 0 件**。HTTP 契約・e2e シナリオは不変（単体 71→77） |
| 27 | 画像付きタスク作成を再試行安全にする | ✅ | 作成（`POST /tasks`）と画像添付（`POST /tasks/{id}/image`）が別 API のため、本体成功・画像失敗の部分成功で押し直すとタスクが二重作成された（#64）。**作成が通った時点で draft を破棄する**方式で解消。draft は「もう一度作成する」ための唯一の入力源なので、消せば押し直し・リロードのどちらからも再作成できない（フラグでボタンを塞ぐ方式と違い、リロードで復活しない）。部分成功時は確認画面に留まり、再作成ボタンを出さずに「画像を再送する」「画像なしで完了する」の 2 択を提示する。編集フローは `PATCH`（冪等）なので対象外。FE 単体で MSW により部分成功を注入し、再試行後も `POST /tasks` が 1 回だけであることを 2 版とも検証（spa 49→53 / ssr 50→54） |
| 28 | 画像アップロードを受信段階で制限し設定と同期する | ✅ | `FileInterceptor` に Multer の `limits` が無く、上限超過のファイルも**一度メモリへ載ってから** `ParseFilePipe` で弾いていた（#66）。また `MAX_UPLOAD_BYTES` は読み込まれるだけで controller が 2MB をハードコードしていた。`MulterModule.registerAsync` で設定値を `limits.fileSize` に渡し受信段階で停止（超過は **413**）。デコレータ評価時に `ConfigService` を使えない制約は、`ParseFilePipeBuilder` をやめて **DI 可能な `ImageFilePipe`** に置き換えて解決（MIME 違反・欠落は 422 + `errors[].field=file`、サイズは多層防御で 413）。frontend の事前チェックも `NUXT_PUBLIC_MAX_UPLOAD_BYTES` で同期し、TypeSpec の doc・`.env.example`・compose も揃えた。単体は 3 版とも +6（設定値を変えると境界が動くことまで固定）|
| 29 | パスワード上限を UTF-8 72 バイトで検証する | ✅ | 登録の上限が `.max(72)`（**文字数**）で、bcrypt の 72 **バイト**制約と一致していなかった（#63）。「あ」24 文字＝72 バイトで登録したあと、25 文字目を足した別パスワードでも `bcrypt.compare` が成功する（実測で確認）。`isWithinUtf8Bytes` を `zod-helpers` に追加し、**登録とログインの両方**に UTF-8 72 バイト上限を課した（ログインを開けたままだと抜け道が塞がらない）。契約・docs も「文字」から「UTF-8 72 バイト」へ修正。e2e は 3 版とも「先頭 72 バイトが同じ別パスワードではログインできない」ことを検証する（単体 +9 / e2e 27→30）|

## テスト集計

- backend-layered: 単体 61 / e2e 30（入力検証は zod・DryRun 廃止済み・検証失敗は 422 + errors）
- backend-clean: 単体 93 / e2e 30（同一 e2e シナリオ・tasks 読み取りは CQRS 分離・application/presentation 細分化・auth/users もクリーン化・入力検証は zod・検証失敗は 422 + errors）
- backend-onion: 単体 92 / e2e 30（同一 e2e シナリオ・tasks 読み取りは CQRS 分離・auth/users もクリーン化・入力検証は zod・検証失敗は 422 + errors・application は presentation 非依存）
- frontend-spa: 単体 54 / E2E 9（フォーム/レスポンス検証は zod・確認画面は CSR + sessionStorage draft・サーバ 422 をフィールド別表示・作成は再試行安全）
- frontend-ssr: 単体 55 / E2E 8（フォーム/レスポンス検証は zod・確認画面は SSR + BFF Cookie draft・サーバ 422 をフィールド別表示・作成は再試行安全）

## CI

- `.github/workflows/ci.yml`：`pull_request` と `main` への `push` で起動。
- ジョブ: quality（lint / format:check / `-r typecheck`）/ backend（単体 + e2e・SQLite）/ backend-it（DB 忠実性 IT を MySQL コンテナで・3 版）/ scenario-mysql（FE+BE 通しシナリオを MySQL コンテナで）/ frontend（単体）/ e2e（Playwright・SQLite）。
- 共通セットアップは `.github/actions/setup`（pnpm/Node + `install` + `api:gen`）。生成物は `.gitignore` 対象のため各ジョブで `api:gen` を実行する。
- `changes` ジョブ（`dorny/paths-filter`）でコード変更の有無を判定し、doc のみの変更では quality/backend/frontend/e2e を skip する（skip は required check 上は緑扱いのためマージは止まらない）。

## 今後の候補（未着手）

- 本番向けマイグレーション運用（synchronize 廃止）
- タスクの検索・ページネーション
- frontend の dev サーバ復旧（`nuxt dev` の Vite 7 非互換を解消。現状は `docker compose` か本番ビルド出力で代替）
- `backend-layered` の auth/users アーキ移行（意図的に baseline のまま。比較用に従来レイヤードを残す）
- CI の Node 20 アクション非推奨対応（`actions/checkout` 等を Node 24 対応版へ）
- draft を Nitro サーバ側ストアに置く版（Cookie 直の 4KB 制約そのものを撤廃できる）
- **FE の E2E ポート分離**（spa/ssr とも 3000 を使うため、`reuseExistingServer` によりローカルで 2 版を続けて回すと前のサーバが再利用され誤った結果になる。spa=3000 / ssr=3100 に分ける）
- `frontend-ssr` の編集フロー（`/tasks/[id]/edit`）の確認画面も SSR 化するか
