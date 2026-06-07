# その他仕様書

用語集・参照資料・付録など、他のドキュメントに収まらない情報をまとめるドキュメント。

## 用語集

| 用語 | 定義 |
|------|------|
| 契約（Contract） | `packages/api-spec/main.tsp`（TypeSpec）。API の単一の真実。OpenAPI → 型/クライアントを生成する |
| DryRun | 保存せずに入力を検証するだけの `*/validate` エンドポイント。成功は 200 `{ valid: true }` |
| BFF | Nitro の `server/api/auth/*`。リフレッシュトークンを httpOnly Cookie 化する仲介層 |
| アクセストークン | 短命の JWT。FE ではメモリ（`useState`）のみで保持し localStorage に置かない |
| リフレッシュトークン | 長命の JWT。httpOnly Cookie で扱い、使用時にローテーション（旧トークン失効） |
| 所有者認可 | タスクは作成者のみ操作可。存在しない=404 / 非所有=403 を区別 |
| ポータブル型 | MySQL / SQLite 双方で動く DB カラム型（`varchar` / `text` / `datetime`）。enum カラムは使わない |
| imageUrl | タスク添付画像の公開パス（例 `/uploads/<file>`）。`Task` のレスポンス専用フィールド |

## 参照資料

- TypeSpec / OpenAPI: `packages/api-spec/main.tsp` → `tsp-output/openapi.yaml`
- Swagger UI（対話的ドキュメント）: backend 起動中の `http://localhost:3001/docs`
- 開発ルール: `.claude/rules/`（workflow / testing / stack-backend / stack-frontend ほか）
- 各仕様: `docs/01`〜`11`

## 付録

- 主要ポート: frontend `3000` / backend `3001` / MySQL `3306`（e2e 用 `mysql-test` は `3307`・`test` profile）。
- DB 切替: `DB_TYPE=mysql`（本番/compose）/ `better-sqlite3`（ローカル・e2e）。
- 画像保存先: `UPLOAD_DIR`（既定 `apps/backend/uploads`）。compose では `uploads-data` volume をマウント。
- 再生成: `pnpm api:gen`（契約 → OpenAPI → 型/クライアント、Swagger もこの生成物を配信）。
