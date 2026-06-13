---
description: フロントエンド（Nuxt3）スタック依存ルール
globs: apps/frontend-spa/**
---

# フロントエンド規約

- **副作用は Composable に集約**: HTTP・状態は `composables/` に閉じ込め、コンポーネントは表示に専念する（テスト容易性のため）。
- **API 呼び出し**: タスク等は生成クライアント (`useApiClient`) 経由。型は `@app/api-client` を使う。
- **認証**: アクセストークンはメモリ（`useState`）のみ。リフレッシュトークンは Nitro BFF (`server/api/auth/*`) の httpOnly Cookie で扱う。localStorage に置かない。
- **テスト**:
  - backend への HTTP は **MSW** でモック。
  - Nitro エンドポイント（BFF）は `registerEndpoint` でモック。
  - コンポーネントは `@nuxt/test-utils` の `mountSuspended` + Vue Test Utils。
- **E2E**: dev サーバ（Vite7 非互換）ではなく本番ビルド出力を起動して Playwright で検証する。
