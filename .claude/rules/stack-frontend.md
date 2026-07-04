---
description: フロントエンド（Nuxt3）スタック依存ルール
globs: apps/frontend-*/**
---

# フロントエンド規約

> レンダリング方式の比較用に 2 つのフロントエンド実装を持つ。**いずれも同一機能**で、同じ E2E シナリオが通る。
> - **`frontend-spa`**: `ssr: false`（SPA）。セッション復元はクライアント（`plugins/auth-init.client.ts`）。
> - **`frontend-ssr`**: `ssr: true`。初期リクエスト時に**サーバ側**で httpOnly リフレッシュ Cookie からセッションを復元（`plugins/auth-init.ts`）し、SSR 描画＋ハイドレーションに使う。`useApiClient` は SSR 時にサーバ用 base を使う。

- **副作用は Composable に集約**: HTTP・状態は `composables/` に閉じ込め、コンポーネントは表示に専念する（テスト容易性のため）。
- **API 呼び出し**: タスク等は生成クライアント (`useApiClient`) 経由。型は `@app/api-client` を使う。
- **入力/レスポンス検証（両 frontend で zod）**: `frontend-spa` / `frontend-ssr` ともにフォーム検証（`utils/taskFormSchema.ts`）と backend レスポンスのランタイム検証（`utils/taskSchema.ts` を `useTasks` で `parse`）に zod を用いる（型はコンパイル時保証にすぎないため境界で実体を検証する。壊れた応答は 500 として UI に流さない）。URL の安全判定は `utils/safeUrl.ts` の `isSafeHttpUrl` を共有する。当初は spa のみ zod（ssr は自前関数）だったが ssr へ横展開した。
- **認証**: アクセストークンはメモリ（`useState`）のみ。リフレッシュトークンは Nitro BFF (`server/api/auth/*`) の httpOnly Cookie で扱う。localStorage に置かない。SSR 版はサーバ側復元時もリフレッシュトークンを httpOnly Cookie のまま扱う（クライアント JS には出さない）。
- **テスト**:
  - backend への HTTP は **MSW** でモック。
  - Nitro エンドポイント（BFF）は `registerEndpoint` でモック。
  - コンポーネントは `@nuxt/test-utils` の `mountSuspended` + Vue Test Utils。
- **E2E**: dev サーバ（Vite7 非互換）ではなく本番ビルド出力を起動して Playwright で検証する。
