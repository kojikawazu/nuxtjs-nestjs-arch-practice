---
description: バックエンド（NestJS / TypeORM）スタック依存ルール
globs: apps/backend-*/**
---

# バックエンド規約

> アーキテクチャ比較用に複数のバックエンド実装を持つ。**いずれも同一の API 契約（`@app/api-client`）を実装**し、同じ e2e シナリオが通ることを担保する（外から見た挙動は同一・内部構造のみ異なる）。

## アーキ別の構成

- **`backend-layered`（レイヤード + UseCase）**: presentation / application / infrastructure をフォルダ分離。
  - auth / users: 役割で区別する従来レイヤード（Controller/Service/Entity）。
  - tasks: UseCase 層を足し、UseCase は TypeORM Repository を**直接**利用（ポートによる依存性逆転はしない）。共有処理は `application/task.util.ts`。
- **`backend-clean`（クリーンアーキテクチャ）**: tasks を依存性逆転で再構成。
  - `domain/`（Task エンティティ・業務ルール・DomainError、フレームワーク非依存）→ `application/`（UseCase は `ports/` の interface = `TaskRepository` / `ImageStorage` にのみ依存）→ `infrastructure/`（TypeORM 実装・ローカルFS 実装が Port を実装）→ `presentation/`（Controller）。
  - UseCase は TypeORM を知らない（`@Inject(TASK_REPOSITORY)`）。これが layered との本質的な差。
  - 業務エラーは `DomainError`（kind: not_found/forbidden/invalid）で投げ、HTTP への変換は例外フィルタが担う（ドメインは HTTP 非依存）。
  - auth / users も同様にクリーン化済み（usecase 分解＋ Port: UserRepository / PasswordHasher / TokenIssuer / RefreshTokenRepository。`DomainError` に conflict(409)/unauthorized(401) を追加）。
- **`backend-onion`（オニオンアーキテクチャ）**: clean と近いが配置が異なる。
  - **契約（`TaskRepository` / `ImageStorage` interface）と DI トークンを `domain/` 中核が所有**（clean は `application/ports/` に置く）。`domain/repositories/` `domain/services/`。
  - 所有チェック等のドメインロジックは**ドメインサービス** `domain/services/task-access.service.ts`（`TaskAccessService`）に置き、application のユースケースが再利用する。
  - 依存は常に内向き（presentation → application → domain）。infrastructure が domain の契約を実装する。
  - DomainError・例外フィルタは clean と同じ。auth / users も clean 同様にクリーン化済み（usecase 分解＋ Port）。ただし契約（interface + DI トークン）は onion 流に `domain/`（`repositories/` `services/`）が所有する。
- **DTO / 入力検証**: **全 backend 版（layered / clean / onion）が zod を採用**する。`presentation/dto/` に zod スキーマを置き、ルート単位の `ZodValidationPipe`（`common/pipes/`）で検証する。グローバル `ValidationPipe` は使わない。`.strict()` で未知キーを弾き（旧 `forbidNonWhitelisted` 相当）、`satisfies z.ZodType<契約型>` で契約とのズレを型検出する（旧 `implements 契約型` 相当）。検証失敗は `BadRequestException`（400）で、`AllExceptionsFilter` が `ApiError` へ翻訳する（e2e 契約は 3 版で不変）。
  - 当初は `backend-clean` のみ zod（他は class-validator）だったが、検証手法を layered / onion へ横展開し zod に統一した（class-validator / class-transformer / @nestjs/mapped-types は 3 版とも除去）。ISO 日付・http/https URL の判定は `common/validation/zod-helpers.ts`（`isIso8601` / `isHttpUrl`）を共有する。
- **型の共有**: レスポンス型・ドメイン型は `@app/api-client` を `import type` で参照する（実行時依存にしない）。
- **DB**: カラム型は MySQL / SQLite 双方で動くポータブルな型のみ（enum カラム禁止、`varchar` + 型/バリデーションで担保）。`DB_TYPE` で接続先を切替。
- **監査列**: `createdAt` / `updatedAt` / `deletedAt` は **TypeORM の機構で自動設定する**（アプリケーションコードで値を組み立てない）。
  - **手動代入を禁止**する。`entity.updatedAt = new Date()` のように usecase / service / repository 層で監査列へ値を書かない（値の生成は TypeORM に委ねる）。ドメイン ↔ ORM のマッパーが**DB から読んだ値をそのまま往復させる**代入（`task.mapper.ts` の `orm.createdAt = s.createdAt`）は、新しい値を作っていないため対象外。
  - 必ず**専用デコレーター**で宣言する: `@CreateDateColumn()` / `@UpdateDateColumn()` / `@DeleteDateColumn()`。素の `@Column({ type: 'timestamp' })` で代用しない（自動更新が効かなくなる）。
  - 論理削除を導入する場合は `softDelete()` / `softRemove()` を使い、`deletedAt` へ手で日時を代入しない。
  - 監査列を複数 Entity で共有する場合は**抽象ベースクラス**（例: `abstract class AuditableEntity`）に集約して `extends` する。TypeORM 組み込みの `BaseEntity`（Active Record 用）と衝突しない名前にする。
  - **例外**: シードデータ・テストで日時を固定する場合のみ明示指定を許容する（本番コードパスには持ち込まない）。
- **秘密値**: パスワードは bcrypt（72バイト以内）、リフレッシュ等の長い値は SHA-256 + `timingSafeEqual`。
- **テスト**: Service 単体は Repository のみモック。e2e は supertest + in-memory SQLite（外部依存なしで速く回す）。**DB 固有の挙動（照合順序・unique 制約）は e2e では検出できない**ため、MySQL コンテナを使う IT（`test:it` / `*.it-spec.ts`）に切り出して 3 版とも回す。レベルの使い分けは [testing.md](./testing.md) を参照。
