# Step 5: フロントエンドを読む

> [← コードリーディングガイド 索引](./README.md)

「副作用（HTTP・状態）は Composable に閉じ込め、コンポーネントは表示に専念」が設計の軸。

```text
apps/frontend-spa/composables/useApiClient.ts   # 生成クライアントにアクセストークンを注入
apps/frontend-spa/composables/useTasks.ts        # タスク CRUD・画像 API のユースケース
apps/frontend-spa/pages/tasks/index.vue          # 一覧
apps/frontend-spa/pages/tasks/new.vue            # 新規作成（フォーム → 確認の2段階）
apps/frontend-spa/pages/tasks/[id]/index.vue     # 詳細
apps/frontend-spa/pages/tasks/[id]/edit.vue      # 編集
apps/frontend-spa/components/TaskForm.vue        # 入力フォーム + クライアント検証 + 画像プレビュー
```

読むポイント:

- `useTasks.ts`: タスク系は生成クライアント（`useApiClient`）経由。**画像 multipart だけは openapi-fetch が不向きなので素の `fetch` + Bearer**。
- `new.vue` / `edit.vue`: 「フォーム → 確認(confirm)」の2段階。クライアント側の入力検証はフォームで即時に出し、サーバ側の業務ルール違反は確定ボタン実行時にエラーとして表示する。画像は本体作成/更新の**後に**別経路でアップロード。
- `TaskForm.vue`: コンポーネントは表示と入力検証のみ。HTTP は持たず、選択ファイルや値を `submit` で親（ページ）に emit する。

---

[← Step 4: バックエンドのレイヤードを読む](./04-backend-layers.md) ・ 次へ: [Step 6: テストを読む →](./06-tests.md)
