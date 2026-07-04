# リファレンス（重要な観点まとめ / 動作確認コマンド）

> [← コードリーディングガイド 索引](./README.md)

## 重要な観点まとめ

| 観点 | 実装 | 関連ファイル |
|---|---|---|
| **型の源泉** | TypeSpec 契約 → 生成型を FE/BE で共有 | `packages/api-spec/main.tsp` |
| **アクセストークンの保管** | メモリ（`useState`）のみ | `composables/useAuthState.ts` |
| **リフレッシュトークンの保管** | httpOnly Cookie（BFF 管理） | `server/api/auth/*`, `server/utils/auth-bff.ts` |
| **認可（所有者チェック）** | 存在=404 / 非所有=403 | `tasks.service.ts` の `findOwned` |
| **未認証時** | 401（`ApiError`） | `guards/jwt-auth.guard.ts`, `http-exception.filter.ts` |
| **削除後** | 204（ボディなし） | `tasks.controller.ts` の `@HttpCode(204)` |
| **入力検証** | zod スキーマ + ルート単位 `ZodValidationPipe` | `modules/**/dto/*.dto.ts`, `common/pipes/zod-validation.pipe.ts` |
| **保存せず検証（DryRun）** | `*/validate` で `save` を呼ばない | `tasks.service.ts`, `auth.service.ts` |
| **画像保存** | FS + volume、DB はパスのみ | `tasks.service.ts`, `config/static-assets.ts` |
| **テストのモック方針** | 外部 I/O のみ（DB/HTTP/fs） | 各 `*.spec.ts` |

## 動作確認コマンド

### セットアップ

```bash
pnpm install
pnpm api:gen        # 契約から型/クライアントを生成（FE/BE の前提）
```

### 起動

```bash
# backend だけを Docker なしで（SQLite インメモリ）
DB_TYPE=better-sqlite3 DB_DATABASE=:memory: pnpm --filter @app/backend-layered dev
# frontend を含めて画面を見る（dev サーバは Vite 7 非互換のため本番ビルド出力を使う）
pnpm --filter @app/frontend-spa build
node apps/frontend-spa/.output/server/index.mjs   # NUXT_PUBLIC_API_BASE_URL で backend を指定
# まとめて（MySQL + backend + frontend）
docker compose up --build
```

- アプリ UI: http://localhost:3000
- Swagger UI（契約と完全一致の対話的ドキュメント）: http://localhost:3001/docs

### API を直接叩く（curl）

```bash
# 登録 → accessToken を取得
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","displayName":"テスト"}'

# タスク一覧（token を置き換える）
curl http://localhost:3001/tasks -H "Authorization: Bearer <token>"

# タスク作成
curl -X POST http://localhost:3001/tasks \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"title":"牛乳を買う","startDate":"2026-06-10T00:00:00.000Z"}'
```

### テスト実行

```bash
pnpm --filter @app/backend-layered test       # BE 単体(Jest)
pnpm --filter @app/backend-layered test:e2e   # BE e2e(supertest / SQLite)
pnpm --filter @app/frontend-spa test      # FE 単体(Vitest + MSW)
pnpm --filter @app/frontend-spa test:e2e  # 全体 E2E(Playwright, ビルド→起動→実行)
```

> これらは GitHub Actions（`.github/workflows/ci.yml`）で PR・`main` push 時に自動実行される。

---

[← Step 6: テストを読む](./06-tests.md) ・ [索引に戻る](./README.md)
