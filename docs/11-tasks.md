# タスク

開発フェーズの進捗を管理する。

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

## テスト集計

- backend: 単体 40 / e2e 35
- frontend: 単体 35 / E2E 3

## CI

- `.github/workflows/ci.yml`：`pull_request` と `main` への `push` で起動。
- ジョブ: quality（lint / format:check / `-r typecheck`）/ backend（単体 + e2e）/ frontend（単体）/ e2e（Playwright）。
- 共通セットアップは `.github/actions/setup`（pnpm/Node + `install` + `api:gen`）。生成物は `.gitignore` 対象のため各ジョブで `api:gen` を実行する。
- `changes` ジョブ（`dorny/paths-filter`）でコード変更の有無を判定し、doc のみの変更では quality/backend/frontend/e2e を skip する（skip は required check 上は緑扱いのためマージは止まらない）。

## 今後の候補（未着手）

- 本番向けマイグレーション運用（synchronize 廃止）
- タスクの検索・ページネーション
