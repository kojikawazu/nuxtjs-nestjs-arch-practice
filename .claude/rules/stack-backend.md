---
description: バックエンド（NestJS / TypeORM）スタック依存ルール
globs: apps/backend/**
---

# バックエンド規約

- **レイヤード**: presentation / application / infrastructure を混在させない。モジュールで 2 方式が併存する。
  - auth / users（従来レイヤード）: ビジネスロジックは Service に置く。層はファイルの役割で区別。
  - tasks（クリーンアーキテクチャ / Onion・参考実装）: 業務ルールは `domain/`、ユースケースは `application/usecases/`、DB/ファイルは `application/ports/` の interface に逆転（実体は `infrastructure/`）。Service は置かない。新規モジュールはどちらかに合わせる。
- **DTO**: リクエストは `class-validator` の DTO で検証し、可能なら契約型（`@app/api-client`）を `implements` して契約とのズレを型で検出する。
- **型の共有**: レスポンス型・ドメイン型は `@app/api-client` を `import type` で参照する（実行時依存にしない）。
- **DB**: カラム型は MySQL / SQLite 双方で動くポータブルな型のみ（enum カラム禁止、`varchar` + 型/バリデーションで担保）。`DB_TYPE` で接続先を切替。
- **秘密値**: パスワードは bcrypt（72バイト以内）、リフレッシュ等の長い値は SHA-256 + `timingSafeEqual`。
- **テスト**: Service 単体は Repository のみモック。e2e は supertest + in-memory SQLite。
