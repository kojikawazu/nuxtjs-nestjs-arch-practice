---
description: コーディング規約（言語・PM・Lint/Format・環境変数・シークレット）
globs:
---

# コーディング規約

- **言語**: TypeScript（strict モード。`tsconfig.base.json` の `strict: true` / Nuxt は `typescript.strict`）。
- **パッケージマネージャ**: pnpm を使用（npm / yarn は使用しない）。バージョンは `package.json` の `packageManager` で固定。
- **Linter / Formatter**: ESLint + Prettier でコード品質・整形を担保する（`pnpm lint` / `pnpm format:check`）。
- **型の共有**: レスポンス型・ドメイン型は `@app/api-client`（TypeSpec 生成物）を参照し、契約を単一の真実とする。
- **`type` と `interface` の使い分け**: オブジェクトの形（DTO・props・エンティティ形・Command 等）は `interface`、ユニオン／交差／別名／タプル／mapped・conditional 型、`z.infer<...>` の推論型は `type` を使う。`consistent-type-definitions` で一方に機械強制はしない（使い分けが正しく、`z.infer` は `type` 一択のため相性が悪い）。
- **環境変数**: 設定値は環境変数で管理（`.env`。`.env.example` を同期更新）。ポート/DB 切替/画像保存先の一覧は [docs/10 付録](../../docs/10-miscellaneous-specification.md#付録) を参照。
- **シークレット禁止**: シークレット・認証情報・鍵ファイルをハードコード／コミットしない（[git.md](./git.md) の push 禁止物と対をなす）。

## 関連

- 詳細規約: [jsdoc.md](./jsdoc.md)（JSDoc/コメント）・[testing.md](./testing.md)（テスト）・[git.md](./git.md)（Git・secrets）
- スタック別: [stack-backend.md](./stack-backend.md)（NestJS/TypeORM・入力検証）・[stack-frontend.md](./stack-frontend.md)（Nuxt3・Composable）
- 付録（環境変数・ポート・DB 切替・画像保存先・用語集）: [docs/10-miscellaneous-specification.md](../../docs/10-miscellaneous-specification.md)
- 技術スタック全体: [docs/09-architecture-specification.md](../../docs/09-architecture-specification.md#技術スタック)
