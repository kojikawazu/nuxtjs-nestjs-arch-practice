# Step 3: データモデルを読む

> [← コードリーディングガイド 索引](./README.md)

```
apps/backend/src/modules/users/user.entity.ts            # User
apps/backend/src/modules/tasks/task.entity.ts            # Task（User に紐づく）
apps/backend/src/modules/auth/entities/refresh-token.entity.ts  # RefreshToken
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
- エンティティ（DB 形）と契約型 `Task`（API 形）は別物。変換は `tasks.service.ts` の `toContractTask` が担う。

---

[← Step 2: 認証の仕組みを読む](./02-auth.md) ・ 次へ: [Step 4: バックエンドのレイヤードを読む →](./04-backend-layers.md)
