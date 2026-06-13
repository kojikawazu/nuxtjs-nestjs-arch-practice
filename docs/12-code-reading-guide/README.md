# コードリーディングガイド

このドキュメントは、本モノレポ（Nuxt 3 フロント + NestJS バックエンド + TypeSpec 契約）を初めて読む人のためのナビゲーションガイド。**契約 → バックエンド → フロントエンド → テスト** の順に、どのファイルを・どこに注目して読むかを示す。

## 構成（パッケージ / レイヤー）の対比

| 領域 | ディレクトリ | 役割 | 主な技術 |
|---|---|---|---|
| 契約 | `packages/api-spec/` | API の単一の真実（source of truth） | TypeSpec → OpenAPI |
| 生成物 | `packages/api-client/` | 契約から生成した型 + 型安全クライアント | openapi-typescript / openapi-fetch |
| バックエンド | `apps/backend-layered/` | レイヤード + UseCase（UseCase が TypeORM を直接利用） | NestJS / TypeORM |
| バックエンド（比較） | `apps/backend-clean/` | クリーンアーキ（tasks を Port で依存性逆転。契約は application/ports） | NestJS / TypeORM |
| バックエンド（比較） | `apps/backend-onion/` | オニオン（契約をドメイン中核が所有 + ドメインサービス。同一 API 契約） | NestJS / TypeORM |
| フロントエンド | `apps/frontend-spa/` | SPA（ssr:false）+ Nitro BFF。副作用は Composable に集約 | Nuxt 3 / Tailwind |
| フロントエンド（比較） | `apps/frontend-ssr/` | SSR（ssr:true）。サーバ側でセッション復元。同一機能 | Nuxt 3 / Tailwind |

> **読み始める前に**: `pnpm api:gen` を実行しておくと、`packages/api-client/src/generated/` に型が生成され、FE/BE 双方の `@app/api-client` import が解決できる（生成物は `.gitignore` 対象）。

## 読む順番（推奨）

1. [Step 1: 契約から全体像を把握する](./01-contract.md)
2. [Step 2: 認証の仕組みを読む](./02-auth.md)
3. [Step 3: データモデルを読む](./03-data-model.md)
4. [Step 4: バックエンドのレイヤードを読む（tasks を例に）](./04-backend-layers.md)
5. [Step 5: フロントエンドを読む](./05-frontend.md)
6. [Step 6: テストを読む](./06-tests.md)

## リファレンス

- [重要な観点まとめ / 動作確認コマンド](./07-reference.md)
