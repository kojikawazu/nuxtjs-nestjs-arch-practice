# セキュリティ仕様書

認証・認可・トークン・脆弱性対策を定義する。

## 認証

- **JWT（access + refresh）** + Passport (`passport-jwt`)。
- アクセストークン: 短命（既定 900s）。`Authorization: Bearer` で送信。
- リフレッシュトークン: 長命（既定 7d）。**ローテーション**（使用時に旧トークン行を削除し再発行）。

## トークンの保管

- フロント: **アクセストークンはメモリ（`useState`）のみ**。localStorage には置かない。
- **リフレッシュトークンは httpOnly Cookie**（Nitro BFF が管理）。JS から読めずリロード後はサイレント更新で復元。

## 認可

- タスクは所有者のみ操作可。`TasksService.findOwned` で存在=404 / 非所有=403 を区別。

## パスワード / トークンのハッシュ

- パスワード: **bcrypt**（コスト 12）。DTO で 8〜72 文字に制限（bcrypt の 72 バイト制約に整合）。
- リフレッシュトークン: **SHA-256**（全体をハッシュ）+ `timingSafeEqual` で定数時間比較。
  - bcrypt は 72 バイトで切り捨てるため、JWT のような長い高エントロピー値には不適（テストで実バグとして検出・修正済み）。
  - 各リフレッシュトークンに `jti`(ランダム UUID) を付与し、同一秒・同一 payload でも一意化。

## 脆弱性対策

- 入力検証: `class-validator` + `ValidationPipe`（`whitelist` / `forbidNonWhitelisted`）。
- 例外は `AllExceptionsFilter` で契約 `ApiError` 形へ統一（内部情報を漏らさない）。
- ログイン失敗はユーザー有無を区別しない（列挙防止）。

## 機密情報の管理

- シークレットは環境変数（`.env`、`.gitignore` で除外）。`.env.example` をテンプレートとして提供。
