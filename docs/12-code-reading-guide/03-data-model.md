# Step 3: データモデルを読む

> [← コードリーディングガイド 索引](./README.md)

```
apps/backend-layered/src/common/entities/auditable.entity.ts     # 監査列（createdAt/updatedAt）の抽象ベースクラス
apps/backend-layered/src/modules/users/user.entity.ts            # User
apps/backend-layered/src/modules/tasks/infrastructure/task.entity.ts   # Task（User に紐づく）
apps/backend-layered/src/modules/auth/entities/refresh-token.entity.ts  # RefreshToken
```

**関連図**

```
User
 ├── has many Task          (userId で所有)
 └── has many RefreshToken  (tokenHash を保存)
```

読むポイント:

- カラム型は MySQL / SQLite 双方で動く**ポータブル型のみ**（`varchar` / `text` / `datetime`）。`status` は enum カラムにせず `varchar` + 契約型 `TaskStatus` + DTO バリデーションで担保。
- `Task.imageUrl` は `varchar(512)` nullable。実体はファイルシステム、DB には公開パスだけ。
- 監査列は各 Entity で書かず `AuditableEntity` を `extends` して受け取る。値は TypeORM の `@CreateDateColumn` / `@UpdateDateColumn` が入れるのでアプリ側では代入しない。`RefreshToken` だけは継承しない（ローテーションが DELETE + INSERT なので `updatedAt` が情報を持たない）。
- エンティティ（DB 形）と契約型 `Task`（API 形）は別物。変換は `tasks.service.ts` の `toContractTask` が担う。

---

[← Step 2: 認証の仕組みを読む](./02-auth.md) ・ 次へ: [Step 4: バックエンドのレイヤードを読む →](./04-backend-layers.md)
