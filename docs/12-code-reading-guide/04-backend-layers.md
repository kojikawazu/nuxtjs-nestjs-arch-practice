# Step 4: バックエンドのレイヤードを読む（tasks を例に）

> [← コードリーディングガイド 索引](./README.md)

tasks はクリーンアーキテクチャ（Onion / Ports）で実装されている。リクエストの流れ:
**Controller(presentation) → UseCase(application) → Port(interface) ← Repository/Storage(infrastructure)**、
業務ルールは **Domain** に集約。

```
apps/backend/src/modules/tasks/
├ presentation/
│  ├ tasks.controller.ts            # HTTP 入口・DTO 受け・@CurrentUser・UseCase に委譲
│  ├ dto/*.dto.ts                   # class-validator で入力検証（契約型を implements）
│  ├ task-request.mapper.ts         # DTO(ISO文字列) → ドメイン入力(Date) へ変換
│  ├ task-response.mapper.ts        # ドメイン Task → 契約 Task(@app/api-client) へ変換
│  └ domain-exception.filter.ts     # DomainError → ApiError（HTTP 化）。コントローラスコープ
├ application/
│  ├ usecases/*.usecase.ts          # 1 ルート = 1 ユースケース。ポート経由で domain を操作
│  └ ports/*.port.ts                # TaskRepositoryPort / ImageStoragePort（DI トークン付き）
├ domain/
│  ├ task.ts                        # Task / TaskDraft（既定値・開始≤終了・所有者認可・更新）
│  └ task-errors.ts                 # DomainError（NotFound/AccessDenied/InvalidDateRange/UnsupportedImageType）
└ infrastructure/
   ├ entities/task.entity.ts        # TypeORM スキーマ（テーブル形）
   ├ repositories/typeorm-task.repository.ts  # TaskRepositoryPort 実装
   ├ storage/local-image-storage.ts # ImageStoragePort 実装（mkdir/writeFile/unlink・MIME 判定）
   └ mappers/task.mapper.ts         # Entity ⇄ ドメイン
```

読むポイント:

- **依存は内向き**。`presentation → application → domain`、`infrastructure → application(ports)`。domain は何にも依存しない。
- **依存性逆転**: UseCase は `@Inject(TASK_REPOSITORY)` でポート（interface）に依存し、実体（TypeORM 実装）は `tasks.module.ts` の DI で差し込む。
- 認可: `domain/task.ts` の `assertOwnedBy` が非所有を `TaskAccessDeniedError`（→403）に。不存在は UseCase が `TaskNotFoundError`（→404）。
- 日付: `startDate` 必須・`endDate` 任意・`startDate ≤ endDate`。`TaskDraft.create` / `Task.applyUpdate` が `InvalidDateRangeError`（→400）。
- DryRun: `validate-create` / `validate-update` ユースケースは検証だけして **永続化（repo.create/update）を呼ばない**。
- 画像: `set-task-image` ユースケースが `ImageStoragePort.save`（サーバ生成 uuid 名・MIME 判定）→ ドメイン更新 → 永続化 → 旧ファイル掃除の順。MIME/サイズの一次検証は Controller の `ParseFilePipe`。
- 3 表現の変換: domain ↔ Entity は `task.mapper.ts`、domain ↔ 契約は presentation の `task-response.mapper.ts`。

> **差分ポイント1**: domain は HTTP を知らず `DomainError` を投げる。`DomainExceptionFilter` が `ApiError { statusCode, message, error }` に翻訳（グローバルの `AllExceptionsFilter` と同形）。
> **差分ポイント2**: auth / users は従来レイヤード（Controller/Service/Entity を役割で区別）のまま。tasks のみ Onion へ先行移行した参考実装。

---

[← Step 3: データモデルを読む](./03-data-model.md) ・ 次へ: [Step 5: フロントエンドを読む →](./05-frontend.md)
