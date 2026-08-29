# Step 6: テストを読む

> [← コードリーディングガイド 索引](./README.md)

テストはコードの「仕様書」。実装より先にテストを読むと意図が分かりやすい。**モックは外部 I/O（DB・HTTP・fs）のみ**で、ビジネスロジックはモックしない。

| 層 | ファイル | モック対象 |
|---|---|---|
| BE Service 単体 | `apps/backend-layered/src/modules/**/**.spec.ts` | Repository(DB) と fs のみ |
| BE e2e | `apps/backend-layered/test/*.e2e-spec.ts` | なし（in-memory SQLite + supertest） |
| BE e2e 基盤 | `apps/backend-layered/test/test-app.factory.ts` | DB を `:memory:`、画像を一時ディレクトリに隔離 |
| FE Composable (`useTasks`) | `apps/frontend-spa/tests/unit/useTasks.spec.ts` | backend への HTTP を **MSW** |
| FE Composable (`useAuth`) | `apps/frontend-spa/tests/unit/useAuth.spec.ts` | Nitro BFF を `registerEndpoint` |
| FE Component | `apps/frontend-spa/tests/unit/TaskForm.spec.ts` | flatpickr を `vi.mock` |
| MSW セットアップ | `apps/frontend-spa/tests/setup/msw.ts` | — |
| 全体 E2E | `apps/frontend-spa/tests/e2e/task-flow.spec.ts` | なし（実スタック / Playwright） |

読むポイント:

- Validator のテストは「`create`/`update` が**呼ばれない**こと」と「検証済みドメイン（`NewTask` / `Task`）を返すこと」をアサートし、検証だけで書き込みが起きないことを保証する。
- e2e は `test-app.factory.ts` の `createTestApp` が SQLite と `/uploads` 静的配信を本番と同じ経路で立てる。
- 比率は「正常系 1 : 異常系（準正常系 + 異常系）2 以上」を目安にしている。

---

[← Step 5: フロントエンドを読む](./05-frontend.md) ・ 次へ: [重要な観点まとめ / 動作確認コマンド →](./07-reference.md)
