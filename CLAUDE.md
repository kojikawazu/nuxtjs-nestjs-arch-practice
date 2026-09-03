# nuxtjs-nestjs-arch-practice

Nuxt.js + NestJS のアーキテクチャ practice プロジェクト（同一の API 契約を layered / clean / onion の 3 バックエンドで、同一機能を SPA / SSR の 2 フロントエンドで実装し、比較する）

## Rules

明示的な指示がなくても、`.claude/rules/` 内のルールを常に守ってください。

| ファイル | スコープ | 内容 |
|---------|---------|------|
| shortcuts.md | 全体 | 指示ショートカット（PR出して、PR承認しました 等） |
| workflow.md | 全体 | 開発フロー（ブランチ運用・テスト必須） |
| quality-gate.md | 全体 | 品質ゲート（セルフレビュー・設計/実装レビュー） |
| documentation.md | 全体 | ドキュメント更新ルール（影響マップ + opt-out 完了条件） |
| git.md | 全体 | GitHub Flow・ブランチ命名・push 禁止物 |
| coding-standards.md | 全体 | 言語/PM/Lint・Format・環境変数・シークレット禁止 |
| static-analysis.md | 全体 | 静的解析の運用（警告ゼロ・抑制の作法・無効化の理由を残す） |
| github-actions.md | .github/workflows/* | ワークフローの静的解析（actionlint）・発火設計 |
| jsdoc.md | 全体 | JSDoc/コメント規約（型は書かず why を残す・controller/application に付与） |
| testing.md | 全体 | テスト分類・レベル（UT/IT/e2e/シナリオ）・原則 |
| stack-backend.md | apps/backend-* | NestJS/TypeORM 各アーキ版（layered/clean/onion）・DTO・DB・監査列・テスト方針 |
| stack-frontend.md | apps/frontend-* | Nuxt3 各方式（SPA/SSR）・Composable・認証・テスト方針 |
| commands.md | 全体 | pnpm/テスト/Docker のよく使うコマンド |
