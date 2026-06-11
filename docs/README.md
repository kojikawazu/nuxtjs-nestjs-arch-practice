# ドキュメント索引

nuxtjs-nestjs-test-practice（Nuxt 3 + NestJS のテスト practice／タスク管理アプリ）の仕様・設計ドキュメント一覧。プロジェクト概要・セットアップ・起動手順はリポジトリ直下の [`../README.md`](../README.md) を参照。

ドキュメントは 2 層で構成している。

- **標準仕様書（`01`〜`11`）** — 仕様の正準。番号順に読むと全体像をつかめる。
- **[`12-code-reading-guide/`](./12-code-reading-guide/README.md)** — コードリーディングガイド（契約 → BE → FE → テストの読む順番。Step 別に分割）。

スクリーンショット等の画像は [`images/`](./images/) に置く。

## 読み進め順（おすすめ）

`01 要求 → 02 要件 → 03 機能 → 05 データ → 06 セキュリティ → 07 API → 08 テスト → 09 アーキテクチャ`。
04・10・11 は随時参照。初めてコードを読む場合は [`12-code-reading-guide/`](./12-code-reading-guide/README.md)（起動コマンド・curl 例つき）から。

## 標準仕様書

| # | ドキュメント | 概要 |
|---|---|---|
| 01 | [要求仕様書](./01-business-requirements.md) | 背景・目標・スコープ・ステークホルダー・制約 |
| 02 | [要件仕様書](./02-requirements-specification.md) | 機能要件一覧・受け入れ条件・優先度 |
| 03 | [機能仕様書](./03-functional-specification.md) | 機能詳細・ユーザーフロー・UI/UX・業務ロジック |
| 04 | [非機能仕様書](./04-non-functional-specification.md) | 性能・可用性・信頼性・保守性 |
| 05 | [データ仕様書](./05-data-specification.md) | データモデル・ER 図・スキーマ・ポータブル型 |
| 06 | [セキュリティ仕様書](./06-security-specification.md) | JWT・トークン保管・アップロード検証・リンクプレビュー |
| 07 | [API 仕様書](./07-api-specification.md) | エンドポイント・契約・Swagger UI |
| 08 | [テスト仕様書](./08-test-specification.md) | 各層のテスト戦略・モック方針・カバレッジ |
| 09 | [アーキテクチャ仕様書](./09-architecture-specification.md) | システム構成・静的配信/volume・技術スタック |
| 10 | [その他仕様書](./10-miscellaneous-specification.md) | 用語集・参照資料・付録（ポート/DB 切替/画像保存先） |
| 11 | [タスク](./11-tasks.md) | マイルストーン・進捗・テスト集計・CI |

## 12-code-reading-guide/ — コードリーディングガイド

契約 → バックエンド → フロントエンド → テストの順に、どのファイルを・どこに注目して読むかを示す。

| Step | ドキュメント | 対象 |
|---|---|---|
| — | [README](./12-code-reading-guide/README.md) | ガイド全体のナビゲーション・読む順番 |
| 1 | [01-contract](./12-code-reading-guide/01-contract.md) | 契約（TypeSpec）から全体像を把握する |
| 2 | [02-auth](./12-code-reading-guide/02-auth.md) | 認証の仕組みを読む |
| 3 | [03-data-model](./12-code-reading-guide/03-data-model.md) | データモデルを読む |
| 4 | [04-backend-layers](./12-code-reading-guide/04-backend-layers.md) | バックエンドのレイヤードを読む（tasks を例に） |
| 5 | [05-frontend](./12-code-reading-guide/05-frontend.md) | フロントエンドを読む |
| 6 | [06-tests](./12-code-reading-guide/06-tests.md) | テストを読む |
| — | [07-reference](./12-code-reading-guide/07-reference.md) | 重要な観点まとめ・動作確認コマンド |

## 関連

- 開発ルール: [`../CLAUDE.md`](../CLAUDE.md) と [`../.claude/rules/`](../.claude/rules/)
- ドキュメント更新の影響マップ: [`../.claude/rules/documentation.md`](../.claude/rules/documentation.md)
