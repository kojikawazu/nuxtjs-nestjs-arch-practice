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

## テスト集計

- backend-layered: 単体 39 / e2e 35
- backend-clean: 単体 76 / e2e 35（同一 e2e シナリオ・tasks 読み取りは CQRS 分離・application/presentation 細分化・auth/users もクリーン化・入力検証は zod）
- backend-onion: 単体 45 / e2e 35（同一 e2e シナリオ・tasks 読み取りは CQRS 分離）
- frontend-spa: 単体 37 / E2E 3（フォーム/レスポンス検証は zod）
- frontend-ssr: 単体 35 / E2E 3（同一 E2E シナリオ）

## CI

- `.github/workflows/ci.yml`：`pull_request` と `main` への `push` で起動。
- ジョブ: quality（lint / format:check / `-r typecheck`）/ backend（単体 + e2e）/ frontend（単体）/ e2e（Playwright）。
- 共通セットアップは `.github/actions/setup`（pnpm/Node + `install` + `api:gen`）。生成物は `.gitignore` 対象のため各ジョブで `api:gen` を実行する。
- `changes` ジョブ（`dorny/paths-filter`）でコード変更の有無を判定し、doc のみの変更では quality/backend/frontend/e2e を skip する（skip は required check 上は緑扱いのためマージは止まらない）。

## 今後の候補（未着手）

- 本番向けマイグレーション運用（synchronize 廃止）
- タスクの検索・ページネーション
- frontend の dev サーバ復旧（`nuxt dev` の Vite 7 非互換を解消。現状は `docker compose` か本番ビルド出力で代替）
- `backend-onion` の auth / users もアーキ移行（clean は移行済み。onion は現状 auth/users が layered と同一構成）
- CI の Node 20 アクション非推奨対応（`actions/checkout` 等を Node 24 対応版へ）
