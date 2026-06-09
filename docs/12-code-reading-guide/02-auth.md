# Step 2: 認証の仕組みを読む

> [← コードリーディングガイド 索引](./README.md)

認証はアプリ全体の根幹。トークンが「どこで作られ・どこに保管され・どう検証されるか」を押さえる。

**バックエンド（JWT 発行・検証）**

| ファイル | 役割 |
|---|---|
| `apps/backend/src/modules/auth/auth.controller.ts` | register / login / refresh / logout の入口 |
| `apps/backend/src/modules/auth/auth.service.ts` | パスワード照合・トークン発行・**リフレッシュトークンのローテーション** |
| `apps/backend/src/modules/auth/strategies/jwt-access.strategy.ts` | アクセストークン（Bearer）の検証 |
| `apps/backend/src/modules/auth/guards/jwt-auth.guard.ts` | 保護ルートに付ける認証ガード |
| `apps/backend/src/modules/auth/entities/refresh-token.entity.ts` | リフレッシュトークンのハッシュ保存 |
| `apps/backend/src/common/decorators/current-user.decorator.ts` | `@CurrentUser()` で認証済みユーザーを取得 |

読むポイント:

- パスワードは bcrypt、リフレッシュトークンは SHA-256 + `timingSafeEqual`（`auth.service.ts`）。
- リフレッシュ時に旧トークン行を削除して再発行する（ローテーション）。`jti` で同一秒でも一意化。
- `@UseGuards(JwtAuthGuard)` が付くコントローラーは要認証（例: `tasks.controller.ts`）。

**フロントエンド（メモリ + httpOnly Cookie の二層）**

| ファイル | 役割 |
|---|---|
| `apps/frontend/composables/useAuthState.ts` | アクセストークン・ユーザーを `useState`（メモリ）で保持 |
| `apps/frontend/composables/useAuth.ts` | register / login / refresh / logout のユースケース |
| `apps/frontend/server/api/auth/*.post.ts` | **Nitro BFF**。backend を呼び、refresh を httpOnly Cookie 化 |
| `apps/frontend/server/utils/auth-bff.ts` | BFF 共通処理（Cookie 設定・backend 呼び出し） |
| `apps/frontend/middleware/auth.global.ts` | 未認証で保護ページに来たら `/login` へ |
| `apps/frontend/plugins/auth-init.client.ts` | リロード後にサイレント更新でセッション復元 |

読むポイント:

- **アクセストークンはメモリ（`useState`）のみ**。localStorage に置かない。
- **リフレッシュトークンは BFF が httpOnly Cookie で扱う**ので JS から読めない。リロード時は `plugins/auth-init.client.ts` がサイレント更新で復元する。

> **差分ポイント**: ブラウザは「タスク系 API は backend に Bearer 直送」「auth 系は BFF 経由」。BFF だけが refresh Cookie を知っている。

---

[← Step 1: 契約から全体像を把握する](./01-contract.md) ・ 次へ: [Step 3: データモデルを読む →](./03-data-model.md)
