# テスト仕様書

テスト戦略・各層のテスト・ツールを定義する。原則は `.claude/rules/testing.md`。

## 目次

- [テスト戦略（テスト容易性を最優先に設計）](#テスト戦略テスト容易性を最優先に設計)
- [テストケース方針](#テストケース方針)
- [カバレッジの要点（実装済み）](#カバレッジの要点実装済み)
- [テスト実行コマンド](#テスト実行コマンド)
- [既知の制約](#既知の制約)


## テスト戦略（テスト容易性を最優先に設計）

| 層 | ツール | モック対象 | 狙い |
|---|---|---|---|
| BE Service 単体 | Jest | Repository(DB) のみ | ビジネスロジック・認可・トークン回転を本物で検証 |
| BE e2e | Jest + supertest（in-memory SQLite） | なし | HTTP 境界・認可・バリデーション・エラーレスポンス |
| FE Composable `useTasks` | Vitest + **MSW** | backend への HTTP のみ | 副作用を Composable に閉じ込めた設計の検証 |
| FE Composable `useAuth` | Vitest + **registerEndpoint** | Nitro BFF (`/api/auth/*`) | トークンがメモリに入る/消えるロジック |
| FE Component | Vitest + Vue Test Utils | 子/HTTP | バリデーション・confirm/emit |
| 全体 E2E | **Playwright(chromium)** | なし（実スタック） | ユーザー視点の通しシナリオ |

## テストケース方針

- 正常系 1 : 準正常系+異常系 2 以上（`testing.md`）。
- 具体値でアサート（曖昧な `toBeTruthy()` を避ける）。
- ビジネスロジックはモックしない。モックは外部 I/O のみ。

## カバレッジの要点（実装済み）

- 認証: 登録/重複(409)/ログイン失敗(401)/リフレッシュ回転/旧トークン無効化。
- タスク: CRUD/未認証(401)/他人のタスク(403)/不存在(404)/バリデーション(400)。
- DryRun（検証のみ）: register/tasks の `*/validate` で 200/400/409/403/404/401 を検証。
  e2e では **検証後に本登録が成功（重複にならない）/ GET で内容不変**を確認し「書き込みが起きていない」ことを保証。単体では `users.create`/`tasks.save` が**呼ばれない**ことをアサート。
- 日付範囲: `startDate` 必須（未指定→400）、`endDate` 任意、`startDate ≤ endDate`（逆転→400）。更新はマージ後の値で検証。FE は TaskForm のクライアント側検証（開始必須・開始≤終了）と flatpickr UI を Playwright で確認（flatpickr は単体では `vi.mock`）。
- 関連 URL（任意・http/https のみ）:
  - BE 単体: `create`/`update` で `url` が保存・契約 Task に反映されること、未指定時は null になること。
  - BE e2e: 有効な `https://` URL → 201 で反映、`javascript:alert(1)` / 2048 文字超 → 400。
  - FE 単体: `UrlPreview` が http/https のみ `<a>`（`rel="noopener noreferrer"`）を描画し、`javascript:`/`data:` ではリンクを出さない（描画時ガード）。`TaskForm` は不正スキームを submit させない。`useTasks` は `url` を含む body を POST する。
  - E2E: URL 入力 → 確認画面に `url-preview-link` 表示 → 作成後の詳細でも安全なリンクとして表示。
- 画像アップロード（1枚・任意）:
  - BE 単体: `setImage`/`removeImage` で **fs（外部I/O）のみモック**。サーバ生成ファイル名・旧ファイル削除・未対応MIME(400)・404/403 を検証（`writeFile`/`save` が呼ばれないこともアサート）。
  - BE e2e: `POST /tasks/{id}/image` を supertest `.attach` で検証。正常(添付→`GET /uploads/<file>` 200→削除で 404)、不正MIME/超過/ファイル無し(400)、404/403/401。`UPLOAD_DIR` は OS 一時ディレクトリに隔離（外部依存なし）。
  - FE 単体: `useTasks.uploadImage/removeImage`（MSW で multipart を横取り、Bearer 付与を確認）、TaskForm のファイル選択（imageFile emit・非対応MIMEのクライアント検証）。
  - E2E: 画像添付で作成→詳細で表示・実ロード（`naturalWidth>0`）まで確認。

## テスト実行コマンド

```bash
pnpm --filter @app/backend test       # BE 単体(Jest)
pnpm --filter @app/backend test:e2e   # BE e2e(supertest)
pnpm --filter @app/frontend test      # FE 単体(Vitest)
pnpm --filter @app/frontend test:e2e  # 全体 E2E(Playwright, ビルド→起動→実行)
```

## 既知の制約

- backend e2e と Playwright は外部依存なしで動くよう SQLite を使用（本番は MySQL）。
- Playwright は dev サーバ（Vite7 非互換）を避け、本番ビルド出力を起動して検証する。
- compose の `mysql-test`（MySQL での e2e 用使い捨て DB）は `test` profile に隔離。無印 `docker compose up` では起動せず、必要時のみ `docker compose --profile test up mysql-test` で起動する。
