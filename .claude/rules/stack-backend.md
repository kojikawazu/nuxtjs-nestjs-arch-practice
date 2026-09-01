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
  - 所有チェック等のドメインロジックは**ドメインサービス** `application/services/task-access.service.ts`（`TaskAccessService`）に置き、UseCase / Validator が注入して再利用する。取得に Port が要るため domain には置けず application 側に居る（onion は契約を domain が所有するので `domain/services/` に置ける）。クラス・メソッド名は onion と揃え、**差は所在だけ**にする。
  - 業務エラーは `DomainError`（kind: not_found/forbidden/invalid）で投げ、HTTP への変換は例外フィルタが担う（ドメインは HTTP 非依存）。
  - auth / users も同様にクリーン化済み（usecase 分解＋ Port: UserRepository / PasswordHasher / TokenIssuer / RefreshTokenRepository。`DomainError` に conflict(409)/unauthorized(401) を追加）。
  - **共有境界**: `src/shared/` には、feature 名・feature 固有の型・Port に依存しない共通基盤だけを置く（例: `DomainError` の基底、汎用 NestJS Pipe / Filter、形式検証 helper）。Task / Auth / User 固有のエラー・業務ルール・DTO・Port・Entity・Repository 実装は、複数箇所から利用されても `src/api/{feature}/` に置く。`shared/` は便利な雑多フォルダにしない。
- **`backend-onion`（オニオンアーキテクチャ）**: clean と近いが配置が異なる。
  - **契約（`TaskRepository` / `ImageStorage` interface）と DI トークンを `domain/` 中核が所有**（clean は `application/ports/` に置く）。`domain/repositories/` `domain/services/`。
  - 所有チェック等のドメインロジックは**ドメインサービス** `domain/services/task-access.service.ts`（`TaskAccessService`）に置き、application のユースケースが再利用する。
  - 依存は常に内向き（presentation → application → domain）。infrastructure が domain の契約を実装する。
  - DomainError・例外フィルタは clean と同じ。auth / users も clean 同様にクリーン化済み（usecase 分解＋ Port）。ただし契約（interface + DI トークン）は onion 流に `domain/`（`repositories/` `services/`）が所有する。
  - **共有境界**: `src/shared/` には、feature 名・feature 固有の型・domain 契約に依存しない共通基盤だけを置く（例: `DomainError` の基底、汎用 NestJS Pipe / Filter、形式検証 helper）。Task / Auth / User 固有のエラー・業務ルール・DTO・domain の Port / Service・Entity・Repository 実装は、複数箇所から利用されても `src/modules/{feature}/` に置く。`shared/` は domain 契約を集める場所ではない。
- **層内のフォルダ分割（clean / onion 共通）**: 層（`presentation` / `application` / `domain` / `infrastructure`）を切ったら、**その中も役割別サブフォルダまで分ける**。層ディレクトリ直下にファイルを裸で置かない（`*.module.ts` / `*.types.ts` のみ feature 直下＝層の外に置く）。`*.spec.ts` は対象ファイルと同じサブフォルダへ置く。
  - `presentation/` — `controllers/` `dto/` `guards/` `decorators/` `strategies/`
  - `application/` — `usecases/` `validators/` `mappers/` `services/` `inputs/`（＋ clean のみ `ports/` `read-models/` `query-services/`、onion は読み取りが `queries/`）
  - `domain/` — `entities/` `value-objects/` `errors/`（＋ onion のみ契約所有の `repositories/` `services/`）
  - `infrastructure/` — `repositories/` `services/` `entities/`（ORM Entity）`mappers/`
  - **domain と infrastructure は同じ語彙で対称に保つ**（`domain/repositories/` の契約 ↔ `infrastructure/repositories/` の実装、`domain/services/ImageStorage` ↔ `infrastructure/services/LocalImageStorage`）。どの実装がどの契約を満たすかをフォルダ位置だけで辿れるようにするため。
  - **空フォルダは作らない**（未使用の概念フォルダは置かない）が、**実ファイルが 1 個でもサブフォルダは作る**（置き場所を毎回判断しなくて済むことを、ファイル 1 個のフォルダのコストより優先する）。**置かないフォルダとその理由**は下記「採用しない概念」を参照。
  - layered は対象外（tasks のみ層分離し、auth / users は従来レイヤードのまま＝比較軸として維持する）。
- **application は presentation を import しない（clean / onion）**: Controller が契約型（`TaskCreate` / `TaskUpdate` / `RegisterRequest` 等）を `application/inputs/` の変換関数で Command 型（`CreateTaskInput` 等）に直してから UseCase / Validator を呼ぶ。変換関数の引数は **DTO 型（`z.infer<...>`）ではなく契約型**にする（契約型は `@app/api-client` にあり presentation・application のどちらからも等距離なので、共通語彙にすると依存が内向きに揃う）。ISO 文字列 → `Date` の正規化も境界であるこの変換で済ませ、内側に文字列日付を持ち込まない。
- **層の依存方向は ESLint で機械強制する（clean / onion）**: `eslint.config.mjs` の `@typescript-eslint/no-restricted-imports` で下記を禁止し、`pnpm lint` / CI で検出する。規約と手動レビューだけに頼らず、違反したコミットが落ちる状態に保つ。
  - domain → application / infrastructure / presentation ／ application → infrastructure / presentation ／ presentation → infrastructure ／ infrastructure → presentation
  - **layered は対象外**（`presentation → application → infrastructure` の素直な依存＝ Port による逆転をしないこと自体が比較軸のため）。
  - `*.module.ts` は feature 直下＝層の外なので対象にならず、合成ルートとして infrastructure を配線できる。
  - 禁止方向に import したくなったら、それは Port を足す合図（interface + DI トークンを内側に足し、実装を infrastructure に置いて `*.module.ts` で束ねる）。
- **採用しない概念（3 版共通）**: 他フレームワーク由来の下記フォルダ／クラスは**意図的に置かない**。「無いこと」自体が設計判断なので、迷ったときに再導入されないよう理由ごと残す。
  - **`forms/`（Laravel の FormRequest 相当）**: リクエスト検証を 1 クラスにまとめる入れ物は作らない。FormRequest は `authorize()` と `rules()`（形式ルールと `unique:` 等の DB ルール）を同居させるが、本リポジトリではそれぞれ関心が異なるため 3 か所に分けている。**「zod と Validator の間に FormRequest 相当の段がある」のではなく、FormRequest 1 つが下記に分解されている**。
    - **認可**（`authorize()` 相当）→ `presentation/guards/` の Guard ＋ 所有権チェック（`TaskAccessService`）
    - **形式検証**（`required|max:120` 相当。必須・型・長さ・列挙・ISO 日付・URL スキーム）= transport の関心 → `presentation/dto/` の zod スキーマ ＋ ルート単位の `ZodValidationPipe`。422 と `ApiError.errors` の組み立てもここ
    - **業務ルール検証**（`unique:users` 相当。開始≤終了・メール重複）= ドメインの関心 → `application/validators/` の Validator（clean / onion）
    - 迷ったら「**HTTP でなくても成り立つ制約か**」で切り分ける。成り立つならドメイン側（Validator / entity）、HTTP の入り口でしか意味がないなら zod スキーマ側。
    - **検証の入口は各段で 1 つに保つ**（FormRequest が信頼できるのは、それを通らずハンドラへ入る経路が無いため）。保存せず検証だけ行う DryRun エンドポイント（`*/validate`）は、同じルールの入口が二重になるため**再導入しない**。
  - **`models/` `schemas/`**: 契約の真実は `packages/api-spec/main.tsp`（→ `@app/api-client`）にあるため、別に型やスキーマの一覧を持つと二重管理になる。
  - **`resolves/`**: GraphQL 専用の概念で、REST では出番がない。
  - **`interceptors/` `middlewares/`**: 現状は `AllExceptionsFilter`（例外→`ApiError`）と `FileInterceptor`（multipart）で足りている。必要になった時点で作る。
- **domain の構成要素と使い分け（clean / onion）**: `domain/` に置けるのは下記 3 種。判定軸は「不変かどうか」ではなく **同一性（identity）を持つか**と**置き場所があるか**。
  | 要素 | 判定基準 | 置き場所 | 例 |
  |---|---|---|---|
  | **Entity** | **同一性（id）を持ち**、時間とともに状態が変わる。等価性は id で決まる | `domain/entities/` | `Task` / `User` |
  | **Value Object** | 同一性を持たず、**属性だけで等価**。**不変** | `domain/value-objects/` | `DateRange`（開始・終了の対） |
  | **Domain Service** | Entity にも VO にも**自然な置き場所がない**操作（複数の集約にまたがる／契約越しの取得が要る） | onion は `domain/services/`、clean は `application/services/` | `TaskAccessService`（取得＋所有チェック） |
  - **「VO 以外は Domain Service」ではない**。この切り分けを字義どおり適用すると Entity まで Domain Service になり、状態を持たない**貧血ドメイン**になる。Domain Service は**置き場所が無いときの最後の手段**で、既定の受け皿ではない。単一の Entity / VO の責務で済むならそちらのメソッドにする。
  - **VO の要件**:
    - **不変**にする（`readonly`。値を変えるときは新しいインスタンスを作る）。共有しても壊れないことが VO の存在価値なので、setter を持たせない。
    - **同一性を持たせない**。等価性は属性で決まる（必要なら `equals()` を持たせる。id は持たせない）。
    - **不正な状態のインスタンスを作れないようにする**。生成時（ファクトリ / private constructor）に検証し、**通ったあとは常に妥当**であることを型で保証する。これが「検証関数を呼び忘れる」経路を消す仕組み。
  - **VO と zod の責務分担**: VO が担うのは **zod のスキーマでは表現しにくい、フィールド間の関係**だけ（例: 開始 ≤ 終了）。**単一フィールドの長さ・形式・列挙は `presentation/dto/` の zod に残す**（`title` は 1〜120 文字、`url` は http/https 等）。両方に書くと同じルールの入口が 2 つになり、片方だけ変えたときに気づけない。
- **業務ルール検証は Validator に集約する（clean / onion）**: `application/validators/` の Validator を**唯一の検証実体**とし、UseCase は Validator を注入して呼ぶ。自前で同じ検証を書かない（同じルールが 2 か所に散ると、片方だけ変更したときに気づけないため）。
  - **Validator は検証済みのドメインオブジェクトを返す**（`CreateTaskValidator` → `NewTask` / `UpdateTaskValidator` → `Task`）。UseCase はそれをそのまま保存するだけでよく、ロードを伴う検証でも DB read が 1 回で済む。`void` にすると検証時と保存時で別々に読むことになり、その間の他者更新で「検証した対象とは違う行を保存する」ことが起こりうる。
  - 組み立てるものが無い Validator は `void` でよい（`RegisterValidator` はメール重複の有無しか使わないため）。
  - ドメイン不変条件の実体は domain に残す（`Task.draft` / `applyUpdate`）。Validator は「保存せず検証する」オーケストレーションのみ担う。
- **ファイル名から feature 名を落とす（3 版共通）**: feature フォルダ（`tasks/` 等）配下で**操作ごとにファイルが分かれる**場合、ファイル名から feature 名を除く（`create-task.usecase.ts` → `create.usecase.ts`、`set-task-image.usecase.ts` → `set-image.usecase.ts`）。パスが既に feature を示しており冗長なため。
  - 対象は**操作で分かれるファイル**（usecase / validator / query / query-service / dto / input）。
  - **エンティティそのものを指すファイルは feature 名を残す**（`task.mapper.ts` / `task-access.service.ts` / `task.repository.ts` / `task.orm-entity.ts` / `task.read-model.ts` / `typeorm-task.repository.ts`）。落とすと `mapper.ts` のようになり「何を扱うか」がパスからも消えるため。
  - `*.module.ts` / `*.controller.ts` は NestJS 慣習どおり feature 名を保つ（`tasks.module.ts` / `tasks.controller.ts`）。
  - **クラス名は変更しない**（`create.validator.ts` が `CreateTaskValidator` を export する）。クラス名は import 先で単独で読まれるため、feature 名が識別に効く。
- **DTO / 入力検証**: **全 backend 版（layered / clean / onion）が zod を採用**する。`presentation/dto/` に zod スキーマを置き、ルート単位の `ZodValidationPipe`（layered は `common/pipes/`、clean / onion は `shared/presentation/pipes/`）で検証する。グローバル `ValidationPipe` は使わない。`.strict()` で未知キーを弾き（旧 `forbidNonWhitelisted` 相当）、`satisfies z.ZodType<契約型>` で契約とのズレを型検出する（旧 `implements 契約型` 相当）。検証失敗は `UnprocessableEntityException`（**422**）で、`AllExceptionsFilter` が `ApiError` へ翻訳する（e2e 契約は 3 版で不変）。400 は「構文が壊れている」、422 は「構文は正しいが意味的に処理できない」を表し、後者が入力検証の実態にあたる。`ApiError.errors`（`{ field, messages }[]`）にフィールド別の理由を載せ、`message`（全件を連結した一文）と併存させる。業務ルール違反も同じ 422 で返し、clean / onion は `DomainError.fields` を例外フィルタが展開、layered は例外に直接載せる。
  - 当初は `backend-clean` のみ zod（他は class-validator）だったが、検証手法を layered / onion へ横展開し zod に統一した（class-validator / class-transformer / @nestjs/mapped-types は 3 版とも除去）。ISO 日付・http/https URL の判定は layered では `common/validation/zod-helpers.ts`、clean / onion では `shared/validation/zod-helpers.ts` の `isIso8601` / `isHttpUrl` を共有する。
- **型の共有**: レスポンス型・ドメイン型は `@app/api-client` を `import type` で参照する（実行時依存にしない）。
- **DB**: カラム型は MySQL / SQLite 双方で動くポータブルな型のみ（enum カラム禁止、`varchar` + 型/バリデーションで担保）。`DB_TYPE` で接続先を切替。
- **監査列**: `createdAt` / `updatedAt` / `deletedAt` は **TypeORM の機構で自動設定する**（アプリケーションコードで値を組み立てない）。
  - **手動代入を禁止**する。`entity.updatedAt = new Date()` のように usecase / service / repository 層で監査列へ値を書かない（値の生成は TypeORM に委ねる）。ドメイン ↔ ORM のマッパーが**DB から読んだ値をそのまま往復させる**代入（`task.mapper.ts` の `orm.createdAt = s.createdAt`）は、新しい値を作っていないため対象外。
  - 必ず**専用デコレーター**で宣言する: `@CreateDateColumn()` / `@UpdateDateColumn()` / `@DeleteDateColumn()`。素の `@Column({ type: 'timestamp' })` で代用しない（自動更新が効かなくなる）。
  - 論理削除を導入する場合は `softDelete()` / `softRemove()` を使い、`deletedAt` へ手で日時を代入しない。
  - 監査列を複数 Entity で共有する場合は**抽象ベースクラス**（例: `abstract class AuditableEntity`）に集約して `extends` する。TypeORM 組み込みの `BaseEntity`（Active Record 用）と衝突しない名前にする。
  - **例外**: シードデータ・テストで日時を固定する場合のみ明示指定を許容する（本番コードパスには持ち込まない）。
- **アップロードは受信段階で止める**: multipart のサイズ上限は `MulterModule.registerAsync` の `limits.fileSize` に設定値（`MAX_UPLOAD_BYTES`）を渡し、**メモリに載る前**に切る。ハンドラ手前の Pipe だけで検証すると、上限超過のファイルも一度全部受信してから弾くことになる。Pipe 側にも同じ上限を残す（多層防御）。超過は 413（大きすぎて受け取れない）、MIME 違反・欠落は 422（内容が不正）。
  - **上限・許可 MIME をデコレータにハードコードしない**。`ParseFilePipeBuilder` はデコレータ評価時に定数を要求し `ConfigService` を使えないため、**DI 可能な Pipe クラス**（`ImageFilePipe`）にして `@UploadedFile(ImageFilePipe)` で使う。設定を変えたら実際の検証も変わる状態を保つ。
  - frontend の事前チェック（`NUXT_PUBLIC_MAX_UPLOAD_BYTES`）にも同じ値を配る。ずれると「送信できるのにサーバで弾かれる」／「送れるはずのファイルをフォームが拒む」が起きる。
- **秘密値**: パスワードは bcrypt、リフレッシュ等の長い値は SHA-256 + `timingSafeEqual`。
  - パスワードの上限は**文字数ではなく UTF-8 バイト長**（72 バイト）で検証する（`isWithinUtf8Bytes`）。bcrypt は 72 バイト超を静かに切り捨てるため、`.max(72)` だとマルチバイトで「先頭 72 バイトが同じ別パスワードでログインできる」状態になる。
  - **登録とログインの両方**に同じ上限を課す。登録だけ絞ってもログインが無制限なら抜け道は残る。
- **テスト**: Service 単体は Repository のみモック。e2e は supertest + in-memory SQLite（外部依存なしで速く回す）。**DB 固有の挙動（照合順序・unique 制約）は e2e では検出できない**ため、MySQL コンテナを使う IT（`test:it` / `*.it-spec.ts`）に切り出して 3 版とも回す。レベルの使い分けは [testing.md](./testing.md) を参照。
