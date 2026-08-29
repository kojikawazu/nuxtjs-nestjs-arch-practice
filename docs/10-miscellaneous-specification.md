# その他仕様書

用語集・参照資料・付録など、他のドキュメントに収まらない情報をまとめるドキュメント。

## 目次

- [用語集](#用語集)
- [参照資料](#参照資料)
- [付録](#付録)

## 用語集

このプロジェクトで使う用語を、実装例と結び付けて説明する。用語を見つけたら、まずここで「何か」と「このアプリではどこで使うか」を確認する。詳細な設計判断は[アーキテクチャ仕様](./09-architecture-specification.md)と[コードリーディングガイド](./12-code-reading-guide/README.md)を参照する。

### Vue / Nuxt

| 用語 | 意味 | このプロジェクトでの例 |
|------|------|------|
| Component | 表示とユーザー操作を再利用可能な部品に分けた Vue の単位。通信・状態更新は原則 Composable、表示は Component に寄せる。 | [`TaskForm.vue`](../apps/frontend-spa/components/TaskForm.vue) と [`TaskCard.vue`](../apps/frontend-spa/components/TaskCard.vue) |
| `ref` / `computed` | `ref` は単一のリアクティブ値、`computed` は他の状態から導出する読み取り用の値を持つ API。 | [`useAuth.ts`](../apps/frontend-spa/composables/useAuth.ts) の認証状態、[`TaskForm.vue`](../apps/frontend-spa/components/TaskForm.vue) のフォーム表示 |
| Composable | `useXxx` 形式で、HTTP・状態・副作用を再利用可能な関数へ閉じ込める Nuxt の慣習。 | [`useTasks.ts`](../apps/frontend-spa/composables/useTasks.ts)、[`useAuth.ts`](../apps/frontend-spa/composables/useAuth.ts) |
| `useState` | Nuxt の SSR と hydration で共有できる状態。ブラウザストレージではないため、リロード後の復元方法は別に設計する。 | [`useAuthState.ts`](../apps/frontend-ssr/composables/useAuthState.ts) の認証状態 |
| SSR / CSR | SSR はサーバーで初期 HTML を生成する方式、CSR はブラウザで描画する方式。比較対象として SSR 版と SPA 版を併設する。 | [`frontend-ssr/nuxt.config.ts`](../apps/frontend-ssr/nuxt.config.ts)、[`frontend-spa/nuxt.config.ts`](../apps/frontend-spa/nuxt.config.ts) |
| Hydration | SSR で生成した HTML を、ブラウザ側の Vue が状態・イベントと結び付けて操作可能にする処理。 | [`plugins/auth-init.ts`](../apps/frontend-ssr/plugins/auth-init.ts) で復元した認証状態 |
| file-based routing | `pages/` のファイルパスから URL を生成する Nuxt のルーティング。 | [`pages/tasks/[id]/index.vue`](../apps/frontend-spa/pages/tasks/[id]/index.vue) は `/tasks/:id` |
| BFF (Backend for Frontend) | 画面に合わせて backend API を仲介する Nitro サーバー層。ここでは refresh token を httpOnly Cookie に封じ、Bearer token との変換を担う。 | [`server/api/auth/`](../apps/frontend-ssr/server/api/auth/)、[`server/utils/auth-bff.ts`](../apps/frontend-ssr/server/utils/auth-bff.ts) |
| httpOnly Cookie | JavaScript から読めない Cookie。XSS による refresh token の窃取を抑える。 | SSR 確認画面用 draft の [`draft-bff.ts`](../apps/frontend-ssr/server/utils/draft-bff.ts) |
| sessionStorage | タブ単位で保持され、タブを閉じると消えるブラウザストレージ。JavaScript から読めるため秘密情報は置かない。 | SPA 確認画面の [`useTaskDraft.ts`](../apps/frontend-spa/composables/useTaskDraft.ts) |

### API / バックエンド共通

| 用語 | 意味 | このプロジェクトでの例 |
|------|------|------|
| 契約 (Contract) | API の入出力・HTTP ステータスを表す単一の真実。ここでは TypeSpec から OpenAPI と型安全な client を生成する。 | [`packages/api-spec/main.tsp`](../packages/api-spec/main.tsp)、[`packages/api-client/`](../packages/api-client/) |
| TypeSpec / OpenAPI | TypeSpec は API 契約を記述する言語、OpenAPI はその生成結果で、Swagger UI・型生成の入力になる。 | [`main.tsp`](../packages/api-spec/main.tsp) → `tsp-output/openapi.yaml` |
| Controller | HTTP メソッド・パス・入力を受け、Application 層へ処理を委譲する入口。DB 操作・業務判断は置かない。 | [`tasks.controller.ts`](../apps/backend-clean/src/api/tasks/presentation/controllers/tasks.controller.ts) |
| Guard | Controller 到達前に認証・認可を判定する NestJS の仕組み。 | [`jwt-auth.guard.ts`](../apps/backend-clean/src/api/auth/presentation/guards/jwt-auth.guard.ts) |
| Pipe | HTTP 入力を変換・検証する NestJS の仕組み。このプロジェクトでは Zod schema をルート単位で実行する。 | [`zod-validation.pipe.ts`](../apps/backend-clean/src/shared/presentation/pipes/zod-validation.pipe.ts) |
| Zod schema | 実行時に値を検証できる schema。frontend の検証は UX 用であり、信頼できない入力の最終検証は backend が担う。 | [`create-task.dto.ts`](../apps/backend-clean/src/api/tasks/presentation/dto/create-task.dto.ts) |
| DryRun | 永続化せずに入力を検証する `*/validate` エンドポイント。本保存でも同じ業務ルールを再検証する。 | [`validate-create-task.usecase.ts`](../apps/backend-onion/src/modules/tasks/application/usecases/validate-create-task.usecase.ts) |
| DomainError | HTTP に依存しない業務エラーの基底。presentation の例外フィルタが `kind` を HTTP ステータスと `ApiError` へ翻訳する。 | [`domain-error.ts`](../apps/backend-clean/src/shared/domain/errors/domain-error.ts)、[`http-exception.filter.ts`](../apps/backend-clean/src/shared/presentation/filters/http-exception.filter.ts) |
| 所有者認可 | タスクは作成者だけが操作できるという業務ルール。不存在は 404、他者所有は 403 を返す。 | [`task-access.service.ts`](../apps/backend-onion/src/modules/tasks/domain/services/task-access.service.ts) |
| アクセストークン / リフレッシュトークン | 短命の access token は frontend のメモリ、長命の refresh token は httpOnly Cookie で扱い、refresh 時はローテーションする。 | [`auth-bff.ts`](../apps/frontend-spa/server/utils/auth-bff.ts)、[`auth.service.ts`](../apps/backend-layered/src/modules/auth/auth.service.ts) |
| ポータブル型 | MySQL / SQLite 双方で動く DB カラム型。DB 固有 enum は使わず `varchar` と検証で表現する。 | [`task.entity.ts`](../apps/backend-layered/src/modules/tasks/infrastructure/task.entity.ts) |
| `imageUrl` | タスク添付画像の公開パス（例: `/uploads/<file>`）。サーバーが設定する読み取り専用のレスポンスフィールド。 | [`main.tsp`](../packages/api-spec/main.tsp) の `Task.imageUrl` |

### アーキテクチャ比較

| 用語 | 意味 | このプロジェクトでの例 |
|------|------|------|
| レイヤードアーキテクチャ | presentation / application / infrastructure を役割で分ける構成。tasks の UseCase は TypeORM Repository を直接利用する比較用の基準実装。 | [`backend-layered/src/modules/tasks/`](../apps/backend-layered/src/modules/tasks/) |
| クリーンアーキテクチャ | Application が Port に依存し、Infrastructure がその Port を実装することで外部技術への依存を反転する構成。 | [`task-repository.port.ts`](../apps/backend-clean/src/api/tasks/application/ports/task-repository.port.ts)、[`typeorm-task.repository.ts`](../apps/backend-clean/src/api/tasks/infrastructure/repositories/typeorm-task.repository.ts) |
| オニオンアーキテクチャ | 依存を常に内向きに保ち、Domain が必要な契約を所有する構成。Clean との主な差は Port の配置にある。 | [`task.repository.ts`](../apps/backend-onion/src/modules/tasks/domain/repositories/task.repository.ts) |
| Port / Adapter | Port は内側が定義する必要な能力の interface、Adapter は DB・FS・JWT など外部技術でそれを実装する部品。 | [`image-storage.ts`](../apps/backend-onion/src/modules/tasks/domain/services/image-storage.ts) と [`local-image-storage.ts`](../apps/backend-onion/src/modules/tasks/infrastructure/services/local-image-storage.ts) |
| Domain Service | 単一 Entity に属さない業務ルールを、Domain 内で表すサービス。 | [`task-access.service.ts`](../apps/backend-onion/src/modules/tasks/domain/services/task-access.service.ts) |
| `shared/` | feature 名・feature 固有の型・Port / domain 契約を知らない共通基盤だけを置く領域。便利な雑多フォルダにはしない。 | [Clean の `shared/`](../apps/backend-clean/src/shared/)、[Onion の `shared/`](../apps/backend-onion/src/shared/) |
| feature 境界 | Task / Auth / User などの業務機能ごとに、固有の Domain・Application・Infrastructure を閉じる考え方。複数箇所から使っても業務用語を知るものは feature 内に残す。 | [`backend-clean/src/api/tasks/`](../apps/backend-clean/src/api/tasks/)、[`backend-onion/src/modules/tasks/`](../apps/backend-onion/src/modules/tasks/) |
| CQRS-lite | 書き込み（Command）と読み取り（Query）で依存・モデルを分ける最小限の CQRS。読み取りは Domain Entity を生成せず Read Model を返す。 | [`query-services/`](../apps/backend-clean/src/api/tasks/application/query-services/)、[`queries/`](../apps/backend-onion/src/modules/tasks/application/queries/) |
| Read Model | 読み取り側が返す、画面/API に必要な形へ整えたデータ。書き込み用 Domain Entity とは分ける。 | [`task.read-model.ts`](../apps/backend-clean/src/api/tasks/application/read-models/task.read-model.ts) |

### テスト

| 用語 | 意味 | このプロジェクトでの例 |
|------|------|------|
| UT (Unit Test) | 1 クラス・関数のロジックを、外部 I/O をモックして検証するテスト。 | [`create-task.usecase.spec.ts`](../apps/backend-clean/src/api/tasks/application/usecases/create-task.usecase.spec.ts) |
| IT (Integration Test) | 本番 DB 固有の挙動を実物の MySQL で検証するテスト。SQLite との差分を検出するために分ける。 | [`db-fidelity.it-spec.ts`](../apps/backend-clean/test/it/db-fidelity.it-spec.ts) |
| e2e | HTTP リクエストからレスポンスまでを in-memory SQLite で速く検証する backend テスト。 | [`tasks.e2e-spec.ts`](../apps/backend-clean/test/tasks.e2e-spec.ts) |
| シナリオテスト | frontend と backend を通したユーザージャーニーを検証する出荷ゲート。通常の E2E は SQLite を使い、本番 DB に近い MySQL シナリオは `SCENARIO_DB=mysql` を指定する `make test-scenario-mysql` で実行する。 | [`task-flow.spec.ts`](../apps/frontend-spa/tests/e2e/task-flow.spec.ts)、[`Makefile`](../Makefile) |
| MSW | frontend 単体テストで backend HTTP を模擬する Service Worker ベースのライブラリ。 | [`tests/setup/msw.ts`](../apps/frontend-spa/tests/setup/msw.ts) |
| Playwright | ブラウザを操作して E2E・シナリオを検証するテストフレームワーク。 | [`playwright.config.ts`](../apps/frontend-ssr/playwright.config.ts) |
| test double | Repository など外部 I/O の代替物。業務ロジックをモックせず、テストで制御可能な fake を使う。 | [`test/fakes/`](../apps/backend-onion/test/fakes/) |

## 参照資料

- TypeSpec / OpenAPI: `packages/api-spec/main.tsp` → `tsp-output/openapi.yaml`
- Swagger UI（対話的ドキュメント）: backend 起動中の `http://localhost:3001/docs`
- 開発ルール: `.claude/rules/`（[coding-standards](../.claude/rules/coding-standards.md) / [jsdoc](../.claude/rules/jsdoc.md) / workflow / testing / [stack-backend](../.claude/rules/stack-backend.md) / [stack-frontend](../.claude/rules/stack-frontend.md) ほか）。索引は [CLAUDE.md](../CLAUDE.md) の Rules テーブル。
- 各仕様: `docs/01`〜`11`

## 付録

- 主要ポート: frontend `3000` / backend `3001` / MySQL `3306`（e2e 用 `mysql-test` は `3307`・`test` profile）。
- DB 切替: `DB_TYPE=mysql`（本番/compose）/ `better-sqlite3`（ローカル・e2e）。
- 画像保存先: `UPLOAD_DIR`（既定 `uploads`＝backend 作業ディレクトリ相対）。compose では `/repo/apps/backend-layered/uploads` に上書きし、`uploads-data` volume をマウント。
- 再生成: `pnpm api:gen`（契約 → OpenAPI → 型/クライアント、Swagger もこの生成物を配信）。
