# Step 4: バックエンドのレイヤードを読む（tasks を例に）

> [← コードリーディングガイド 索引](./README.md)

tasks は **レイヤード + UseCase** で実装されている。リクエストの流れ:
**Controller(presentation) → UseCase(application) → TypeORM Repository / Entity(infrastructure)**。

```
apps/backend-layered/src/modules/tasks/
├ presentation/
│  ├ tasks.controller.ts            # HTTP 入口・DTO 受け・@CurrentUser・UseCase に委譲するだけ
│  └ dto/*.dto.ts                   # class-validator で入力検証（契約型を implements）
├ application/
│  ├ usecases/*.usecase.ts          # 1 ルート = 1 ユースケース。Repository を直接使い処理を完結
│  └ task.util.ts                   # findOwnedTask / assertDateOrder / toContractTask / 画像 I/O の共有
└ infrastructure/
   └ task.entity.ts                 # TypeORM Entity
apps/backend-layered/src/main.ts                                  # ValidationPipe / 例外フィルタ / 静的配信の起動設定
apps/backend-layered/src/common/filters/http-exception.filter.ts  # 例外を契約 ApiError 形に統一
apps/backend-layered/src/config/static-assets.ts                  # /uploads 静的配信（画像）
```

読むポイント:

- **ビジネスロジックは UseCase に集約**。Controller は受けて UseCase に渡すだけ。1 操作 = 1 クラスなので、変更・テストの単位が小さい。
- **依存性逆転はしない**: UseCase は `@InjectRepository(TaskEntity)` で TypeORM Repository を直接注入し、`NotFoundException` 等の NestJS 例外を直接投げる（ポート interface は無い）。
- 認可: `task.util.ts` の `findOwnedTask` が「存在しない=404 / 非所有=403」を区別。各 UseCase はこれを呼ぶ。
- 日付: `startDate` 必須・`endDate` 任意・`startDate ≤ endDate`（`assertDateOrder`）。
- DryRun: `validate-create` / `validate-update` ユースケースは検証だけして **`save` を呼ばない**（保存しないことがテストで保証される）。
- 画像: `set-task-image` ユースケースが `saveImageFile`（サーバ生成 uuid 名）で保存し旧ファイルを掃除。MIME/サイズの一次検証は Controller の `ParseFilePipe`。
- DTO は `implements TaskCreate`（`@app/api-client`）で契約とのズレを型で検出する。Entity→契約への変換は `toContractTask`。

> **差分ポイント**: 例外は投げっぱなしにせず `AllExceptionsFilter` が `ApiError { statusCode, message, error }` に統一する。内部情報を漏らさない。
> **構成メモ**: auth / users は従来レイヤード（Controller/Service/Entity を役割で区別）。tasks は同じレイヤードに **UseCase 層を足し、presentation/application/infrastructure をフォルダ分離** した形。

---

[← Step 3: データモデルを読む](./03-data-model.md) ・ 次へ: [Step 5: フロントエンドを読む →](./05-frontend.md)
