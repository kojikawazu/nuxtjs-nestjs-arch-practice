---
description: コーディング規約（言語・PM・Lint/Format・環境変数・シークレット）
globs:
---

# コーディング規約

- **言語**: TypeScript（strict モード。`tsconfig.base.json` の `strict: true` / Nuxt は `typescript.strict`）。
- **パッケージマネージャ**: pnpm を使用（npm / yarn は使用しない）。バージョンは `package.json` の `packageManager` で固定。
- **Linter / Formatter**: ESLint + Prettier でコード品質・整形を担保する（`pnpm lint` / `pnpm format:check`）。
- **型の共有**: レスポンス型・ドメイン型は `@app/api-client`（TypeSpec 生成物）を参照し、契約を単一の真実とする。
- **環境変数**: 設定値は環境変数で管理（`.env`。`.env.example` を同期更新）。
- **シークレット禁止**: シークレット・認証情報・鍵ファイルをハードコード／コミットしない（[[git]] の push 禁止物と対をなす）。
