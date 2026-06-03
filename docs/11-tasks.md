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

## テスト集計

- backend: 単体 19 / e2e 11
- frontend: 単体 13 / E2E 2

## 今後の候補（未着手）

- 本番向けマイグレーション運用（synchronize 廃止）
- CI（GitHub Actions）でのテスト自動実行
- タスクの検索・ページネーション
