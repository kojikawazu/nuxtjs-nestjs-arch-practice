# Step 4: バックエンドのレイヤードを読む（tasks を例に）

> [← コードリーディングガイド 索引](./README.md)

リクエストの流れ: **Controller(presentation) → Service(application) → Repository/Entity(infrastructure)**。

```
apps/backend/src/modules/tasks/tasks.controller.ts   # HTTP 入口・DTO 受け・@CurrentUser
apps/backend/src/modules/tasks/dto/*.dto.ts          # class-validator で入力検証（契約型を implements）
apps/backend/src/modules/tasks/tasks.service.ts      # 認可・業務ルール・トークン回転などの本体
apps/backend/src/main.ts                             # ValidationPipe / 例外フィルタ / 静的配信の起動設定
apps/backend/src/common/filters/http-exception.filter.ts  # 例外を契約 ApiError 形に統一
apps/backend/src/config/static-assets.ts             # /uploads 静的配信（画像）
```

読むポイント:

- **ビジネスロジックは Service に集約**。Controller は受けて Service に渡すだけ。
- 認可: `tasks.service.ts` の `findOwned` が「存在しない=404 / 非所有=403」を区別。
- 日付: `startDate` 必須・`endDate` 任意・`startDate ≤ endDate`（`assertDateOrder`）。
- DryRun: `validateCreate` / `validateUpdate` は検証だけして **`save` を呼ばない**（保存しないことがテストで保証される）。
- 画像: `setImage` がサーバ生成 uuid 名で保存し旧ファイルを掃除。MIME/サイズ検証は Controller の `ParseFilePipe`。
- DTO は `implements TaskCreate`（`@app/api-client`）で契約とのズレを型で検出する。

> **差分ポイント**: 例外は投げっぱなしにせず `AllExceptionsFilter` が `ApiError { statusCode, message }` に統一する。内部情報を漏らさない。

---

[← Step 3: データモデルを読む](./03-data-model.md) ・ 次へ: [Step 5: フロントエンドを読む →](./05-frontend.md)
