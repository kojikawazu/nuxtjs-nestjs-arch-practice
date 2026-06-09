# Step 1: 契約から全体像を把握する

> [← コードリーディングガイド 索引](./README.md)

「どんなエンドポイントが・どんな型でやり取りされるか」は契約に全部書いてある。ここを最初に読むと FE/BE の型の出どころが分かる。

```
packages/api-spec/main.tsp          # エンドポイント・モデル定義（唯一の真実）
packages/api-client/src/index.ts    # 生成型の再エクスポート（@app/api-client の入口）
packages/api-client/src/client.ts   # openapi-fetch ベースの型安全クライアント生成
```

読むポイント:

- `main.tsp` の `namespace Auth` / `namespace Tasks` がそのまま `/auth/*` `/tasks/*` のエンドポイント群。
- `model Task` / `model TaskCreate` / `model TaskUpdate` の差分に注目。`imageUrl` は `Task`（レスポンス）にだけあり、`TaskCreate/Update` には無い＝クライアントから直接設定できない読み取り専用フィールド。
- 画像添付は `multipart/form-data`（`op uploadImage`）。`DryRun` は `*/validate` で `DryRunResult` を返す。
- ここから `pnpm api:gen` で `openapi.yaml` → `@app/api-client` の型が生成され、FE/BE が `import type` で共有する。

> **差分ポイント**: コードから OpenAPI を作るのではなく、**TypeSpec から型もクライアントも Swagger UI も生成**する。だから「契約と実装がズレない」。

---

次へ: [Step 2: 認証の仕組みを読む →](./02-auth.md)
