---
description: ドキュメント更新・設計書管理ルール（影響マップ + opt-out の完了条件）
globs:
---

# ドキュメント

コード変更がドキュメント（CLAUDE.md / README.md / docs/）と乖離しないことを構造的に担保する。

## 完了条件（opt-out）

変更は、下記「影響マップ」の対応ドキュメントを**同一 PR 内で更新する**ことを完了条件とする。

- 更新不要と判断した場合は、**PR 説明にその理由を明記する**（省略＝未対応とみなす）。
- この乖離チェックは `/self-review` と `/pr-create` の確認対象に含まれる。

## 影響マップ（変更種別 → 更新必須ドキュメント）

「どのドキュメントだっけ？」を考えさせないための逆引き表。

| 変更種別 | 更新必須ドキュメント |
|---|---|
| API / エンドポイント（NestJS controller・DTO の追加/変更） | docs/07-api-specification.md |
| データモデル（TypeORM entity・スキーマ・マイグレーション） | docs/05-data-specification.md |
| 機能追加・仕様変更（業務ロジック・ユースケース） | docs/03-functional-specification.md（必要に応じ docs/02-requirements-specification.md） |
| 画面・UI（Nuxt3 ページ・コンポーネント・画面遷移） | docs/03-functional-specification.md |
| 認証・認可・セキュリティ方針 | docs/06-security-specification.md |
| 非機能要件（性能・可用性・運用） | docs/04-non-functional-specification.md |
| アーキテクチャ・構成（レイヤー構成・依存・ディレクトリ） | docs/09-architecture-specification.md |
| テスト方針・テストケース | docs/08-test-specification.md（詳細は docs/test-design/） |
| 環境変数・依存パッケージ・ビルド/起動手順・Docker | README.md / CLAUDE.md（必要に応じ docs/10-miscellaneous-specification.md） |
| ルール（.claude/rules/）の追加・変更 | CLAUDE.md の Rules テーブル |
| タスク・進捗 | docs/11-tasks.md |

該当する変更がない場合はスキップする。

## 補足

- **設計書の管理**: タスクごとに設計書を新規作成しない。既存の仕様書ドキュメント（docs/01〜11-*.md, docs/test-design/）に追記・更新する。
- **README.md 同期**: 環境変数・依存・起動手順・スクリプトに変更があった場合は README.md を更新する。
