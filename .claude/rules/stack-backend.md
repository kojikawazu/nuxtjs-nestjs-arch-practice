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
  - auth / users は当面 layered と同じ構成（機能パリティ優先。clean 化は段階対応）。
- **`backend-onion`（オニオンアーキテクチャ）**: clean と近いが配置が異なる。
  - **契約（`TaskRepository` / `ImageStorage` interface）と DI トークンを `domain/` 中核が所有**（clean は `application/ports/` に置く）。`domain/repositories/` `domain/services/`。
  - 所有チェック等のドメインロジックは**ドメインサービス** `domain/services/task-access.service.ts`（`TaskAccessService`）に置き、application のユースケースが再利用する。
  - 依存は常に内向き（presentation → application → domain）。infrastructure が domain の契約を実装する。
  - DomainError・例外フィルタ・auth/users の扱いは clean と同じ。
- **DTO**: リクエストは `class-validator` の DTO で検証し、可能なら契約型（`@app/api-client`）を `implements` して契約とのズレを型で検出する。
- **型の共有**: レスポンス型・ドメイン型は `@app/api-client` を `import type` で参照する（実行時依存にしない）。
- **DB**: カラム型は MySQL / SQLite 双方で動くポータブルな型のみ（enum カラム禁止、`varchar` + 型/バリデーションで担保）。`DB_TYPE` で接続先を切替。
- **秘密値**: パスワードは bcrypt（72バイト以内）、リフレッシュ等の長い値は SHA-256 + `timingSafeEqual`。
- **テスト**: Service 単体は Repository のみモック。e2e は supertest + in-memory SQLite。
