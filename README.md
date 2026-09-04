# nuxtjs-nestjs-arch-practice

[![CI](https://github.com/kojikawazu/nuxtjs-nestjs-arch-practice/actions/workflows/ci.yml/badge.svg)](https://github.com/kojikawazu/nuxtjs-nestjs-arch-practice/actions/workflows/ci.yml)

Nuxt.js + NestJS のアーキテクチャ practice プロジェクト（タスク管理アプリ）

> **English (TL;DR):** A learning monorepo that compares *architectures side by side* on one Nuxt 3 + NestJS task-management app. The same API contract (TypeSpec → OpenAPI) is implemented by three backends (layered / clean / onion) and consumed by two frontends (SPA / SSR); the shared test suite is what proves their externally observable behavior is identical. Quick start: `pnpm install && cp .env.example .env && pnpm api:gen`, then `docker compose up --build` → UI at <http://localhost:3000>, Swagger at <http://localhost:3001/docs>.

## 概要

アーキテクチャの違いを実物で比較することを主目的とした学習用モノレポ。題材として認証付きタスク管理アプリを採用し、**同一の API 契約を 3 つのバックエンド実装（layered / clean / onion）で、同一機能を 2 つのフロントエンド方式（SPA / SSR）で**実装している。同じ題材を並べることで、設計の違いがフォルダ構成・依存方向・テストの書きやすさにどう現れるかを**差分として読める**ことをねらっている。

### 比較軸

| 軸 | 実装 | 違いが出るところ |
| --- | --- | --- |
| バックエンドの層構成 | `backend-layered` / `backend-clean` / `backend-onion` | 依存性逆転の有無、契約（Port）の所有者、ドメインロジックの置き場所 |
| フロントエンドの描画方式 | `frontend-spa` / `frontend-ssr` | セッション復元の場所（クライアント / サーバ）、中間状態（draft）の保持先 |

**外から見た振る舞いは全実装で同一**に保つ。この同一性を人の目ではなく機械的に担保するために、同じ e2e シナリオを 3 版ともに通す。つまりこのリポジトリでは、**テストは目的ではなく「アーキを入れ替えても仕様が変わらない」ことを証明する装置**として存在する（レベルの使い分けは [08 テスト仕様](docs/08-test-specification.md)）。

### 技術スタック

- FE: Nuxt 3 (SPA / SSR) / TailwindCSS / Composable / Nitro BFF
- BE: NestJS / TypeORM / MySQL・SQLite
- 契約: TypeSpec → OpenAPI → 型/クライアント生成（`packages/`）—— 全実装がこの単一の真実を実装する
- テスト: Jest / supertest / Vitest / MSW / Vue Test Utils / Playwright

## 主な機能

- 認証: 登録 / ログイン / リフレッシュ（ローテーション）/ ログアウト（JWT。アクセスはメモリ、リフレッシュは httpOnly Cookie）
- タスク CRUD: 所有者のみ操作可。状態（todo/in_progress/done）、期間（開始必須・終了任意、開始≤終了）
- 画像添付: タスクに 1 枚（任意・png/jpeg/webp・2MB まで）。`/uploads` で静的配信、保存先は volume で永続化
- 関連 URL: タスクに `http`/`https` のみのリンクを添付。確認画面・詳細で**安全なリンクカード**として表示（`javascript:` 等は入力検証＋描画時ガードで遮断、`rel="noopener noreferrer"`）
- 契約から生成した Swagger UI（`/docs`）

詳細な仕様は `docs/` を参照。

## スクリーンショット

| タスク一覧 | 作成時の確認画面（2 段階フロー） |
| --- | --- |
| ![タスク一覧](docs/images/tasks-list.png) | ![確認画面](docs/images/task-confirm.png) |

## 構成

```text
apps/backend-layered    NestJS API（レイヤード + UseCase。UseCase が TypeORM を直接利用）
apps/backend-clean      NestJS API（クリーンアーキ。Port で依存性逆転。契約は application/ports）
apps/backend-onion      NestJS API（オニオン。契約をドメイン中核が所有 + ドメインサービス）
apps/frontend-spa       Nuxt 3 SPA（ssr:false。セッション復元はクライアント）+ Nitro BFF
apps/frontend-ssr       Nuxt 3 SSR（ssr:true。サーバ側でセッション復元）+ Nitro BFF
packages/api-spec       TypeSpec 契約 → OpenAPI
packages/api-client     生成した型 + openapi-fetch クライアント
```

> `backend-layered` / `backend-clean` / `backend-onion` は**同じ API 契約**を異なるアーキで実装した比較用。
> `frontend-spa` / `frontend-ssr` は**同一機能**を SPA / SSR で実装した比較用。
> いずれも同じ e2e シナリオが通る（外から見た挙動は同一）。
> 入力検証は全アプリで **zod** に統一（3 backend はルート単位 `ZodValidationPipe`、2 frontend はフォーム/レスポンス検証。旧 class-validator / 自前関数から横展開）。
> ローカル起動ポート: backend layered=3001 / clean=3002 / onion=3003、frontend spa=3000 / ssr=3010。

## 前提環境

| 必要なもの | バージョン / 備考 |
| --- | --- |
| Node.js | 22 以上 |
| pnpm | 10.33（`package.json` の `packageManager` で固定） |
| Docker / Docker Compose | フルスタックで動かす場合に必要（backend 単体なら SQLite で代替でき不要） |

## セットアップ

```bash
pnpm install
cp .env.example .env
pnpm api:gen        # ← 必須: 契約から型/クライアントを生成

# ← 必須: JWT 秘密鍵を生成して .env に設定（2 本に別々の値を入れる）
echo "JWT_ACCESS_SECRET=$(openssl rand -hex 32)"
echo "JWT_REFRESH_SECRET=$(openssl rand -hex 32)"
```

> ⚠️ **JWT 秘密鍵は必須**です。`.env.example` の該当行は**空**にしてあり、未設定・32 文字未満・`JWT_ACCESS_SECRET` と `JWT_REFRESH_SECRET` が同値のいずれかなら backend は起動に失敗します（既定値へのフォールバックを持たないため。詳細は [06 機密情報の管理](docs/06-security-specification.md#機密情報の管理)）。

> ⚠️ **`pnpm api:gen` は必須**。実行しないと `@app/api-client` の型が未生成のままになり、FE/BE のビルド・型チェック・テストが失敗します（生成物は `.gitignore` 対象で、clone 直後には存在しません）。
>
> `make help` でよく使う操作の一覧を表示できます（`make up` / `make test` / `make gen` など）。

## まず動かす（クイックスタート）

一番簡単なのは Docker で全部まとめて起動する方法です。

```bash
docker compose up --build   # mysql + backend(:3001) + frontend(:3000)
```

- アプリ UI: <http://localhost:3000>
- Swagger UI（対話的 API ドキュメント）: <http://localhost:3001/docs>

> `make up` でも起動できます（こちらは `-d` 付きの**バックグラウンド起動**。ログは `make logs`、停止は `make down`、データごと削除は `make reset`）。

**最初のひとめぐり（ハッピーパス）:**

1. <http://localhost:3000> を開き「登録」から任意のメール / パスワード（8〜72文字）/ 表示名でアカウント作成
2. ログイン状態のまま一覧へ。「新規作成」でタイトルと開始日を入力 →「確認へ」でサーバ検証 ✓ を確認 →「作成する」で確定
3. 一覧・詳細でタスクを確認（画像添付・関連 URL も試せる）

## 個別に起動して開発する

```bash
# backend だけを Docker なしで（SQLite インメモリ・データは再起動で消える）
DB_TYPE=better-sqlite3 DB_DATABASE=:memory: pnpm --filter @app/backend-layered dev

# MySQL を使う場合は先に DB を起動してから backend を起動
pnpm db:up
pnpm --filter @app/backend-layered dev
```

```bash
# frontend の dev サーバ（HMR あり）。spa / ssr のどちらでも起動できる
pnpm --filter @app/frontend-spa dev    # → http://localhost:3000
```

> ℹ️ frontend の dev サーバは Nuxt 3.21.8 以前では起動できませんでした（`ssr: false` で `No entry found in rollupOptions.input`、SSR 版は macOS のソケットパス長超過で全リクエストが 500）。**3.21.9 以降で解消済み**です。詳しい経緯は [docs/11-tasks.md](docs/11-tasks.md) を参照。

## テスト

テストは「アーキを入れ替えても外から見た仕様が変わらない」ことの証明として置いている。**何を実物で確かめるか**でレベルを分ける（詳細は [08 テスト仕様](docs/08-test-specification.md)）。

| レベル | 実物で確かめる範囲 | DB | コマンド |
| --- | --- | --- | --- |
| 単体（UT） | 1 クラス / 関数のロジック。外部 I/O のみモック | 使わない | `pnpm --filter @app/backend-layered test` / `pnpm --filter @app/frontend-spa test` |
| 結合（IT） | 本番 DB 固有の挙動（照合順序・unique 制約） | MySQL コンテナ | `make test-back-it`（3 版まとめて） |
| e2e | HTTP 契約。**3 版が同じ契約を満たすことの担保** | in-memory SQLite | `pnpm --filter @app/backend-layered test:e2e`（BE）/ `make test-e2e`（FE Playwright・スモーク） |
| シナリオ | FE + BE を通した業務ジャーニー（出荷ゲート） | MySQL コンテナ | `make test-scenario-mysql` |

```bash
make test            # BE 単体 + BE e2e + FE 単体をまとめて
make test-back-it    # IT を layered / clean / onion の 3 版で実行（Docker 必須）
```

> backend のコマンドは `@app/backend-layered` を `@app/backend-clean` / `@app/backend-onion` に差し替えれば、そのまま他のアーキ版に対して実行できる（**同じテストが 3 版で通ること**が比較の前提）。

上記は GitHub Actions（`.github/workflows/ci.yml`）で PR・`main` push 時に自動実行される（lint / format / typecheck も含む）。

## 開発・貢献

- 作業は必ず**ブランチを切ってから**着手する（`main` への直接コミットは禁止）。
- 実装にはテストを必ず添え、`pnpm lint` / `pnpm format:check` / `pnpm lint:md` / `pnpm lint:workflows`（Docker 必須）/ 各種テストを通す。
- PR の承認・マージは人間が行う（自動マージ禁止）。詳細な開発ルールは `.claude/rules/`（workflow / testing / git / quality-gate など）を参照。

## AI エージェント向けルール

開発ルールの正本は [`.claude/rules/`](.claude/rules/) です。Claude Code は [`CLAUDE.md`](CLAUDE.md) から、Codex はリポジトリ階層の [`AGENTS.md`](AGENTS.md) から同じルールを参照します。ルール本文は複製せず、変更対象に最も近い `AGENTS.md` が指定する追加ルールも適用します。

| 対象 | Codex 向け指示ファイル | 追加で参照するルール |
|---|---|---|
| リポジトリ全体 | [`AGENTS.md`](AGENTS.md) | 共通ルール |
| `apps/backend-layered/**` | [`apps/backend-layered/AGENTS.md`](apps/backend-layered/AGENTS.md) | NestJS / TypeORM（レイヤード） |
| `apps/backend-clean/**` | [`apps/backend-clean/AGENTS.md`](apps/backend-clean/AGENTS.md) | NestJS / TypeORM（クリーン） |
| `apps/backend-onion/**` | [`apps/backend-onion/AGENTS.md`](apps/backend-onion/AGENTS.md) | NestJS / TypeORM（オニオン） |
| `apps/frontend-spa/**` | [`apps/frontend-spa/AGENTS.md`](apps/frontend-spa/AGENTS.md) | Nuxt 3（SPA） |
| `apps/frontend-ssr/**` | [`apps/frontend-ssr/AGENTS.md`](apps/frontend-ssr/AGENTS.md) | Nuxt 3（SSR） |
| `packages/api-spec/**` | [`packages/api-spec/AGENTS.md`](packages/api-spec/AGENTS.md) | TypeSpec 契約・生成 |
| `packages/api-client/**` | [`packages/api-client/AGENTS.md`](packages/api-client/AGENTS.md) | 生成 API クライアント |

## ドキュメント

仕様書は [`docs/`](docs/README.md) 配下に番号付きで整理している。索引は [docs/README.md](docs/README.md)、開発ルールは [`.claude/rules/`](.claude/rules/) を参照。

### よくある探し物（クイックリンク）

| 知りたいこと | 参照先 |
|---|---|
| **初めてコードを読む / 起動コマンド・curl 例** | [docs/12-code-reading-guide/](docs/12-code-reading-guide/README.md) |
| **アーキの読み比べ**（layered / clean / onion の差・SPA vs SSR・選定のトレードオフ） | [docs/09 アーキテクチャ選定指針](docs/09-architecture-specification.md#アーキテクチャ選定指針トレードオフ) |
| **アーキテクチャ・構成**（何が動く？ 静的配信・volume・技術スタック） | [docs/09-architecture-specification.md](docs/09-architecture-specification.md) |
| **ポート番号・DB 切替・画像保存先**（3000 / 3001 / 3306 など） | [docs/10-miscellaneous-specification.md](docs/10-miscellaneous-specification.md) |
| **DB**（ER 図・テーブルスキーマ・`imageUrl`） | [docs/05-data-specification.md](docs/05-data-specification.md) |
| **セキュリティ**（認証・トークン保管・アップロード検証） | [docs/06-security-specification.md](docs/06-security-specification.md) |
| **API エンドポイント一覧 / Swagger** | [docs/07-api-specification.md](docs/07-api-specification.md) |
| **機能・画面遷移・確認画面（2段階）** | [docs/03-functional-specification.md](docs/03-functional-specification.md) |
| **テスト方針・各層のモック対象** | [docs/08-test-specification.md](docs/08-test-specification.md) |
| **進捗・CI** | [docs/11-tasks.md](docs/11-tasks.md) |

<details>
<summary><b>ドキュメント一覧（01〜12）を開く</b></summary>

| # | ファイル | 内容 |
|---|---|---|
| 01 | [business-requirements](docs/01-business-requirements.md) | 要求仕様（背景・目標・スコープ・制約） |
| 02 | [requirements-specification](docs/02-requirements-specification.md) | 要件仕様（機能要件一覧・受け入れ条件・優先度） |
| 03 | [functional-specification](docs/03-functional-specification.md) | 機能仕様（機能詳細・ユーザーフロー・UI/UX・業務ロジック） |
| 04 | [non-functional-specification](docs/04-non-functional-specification.md) | 非機能仕様（性能・可用性・信頼性・保守性） |
| 05 | [data-specification](docs/05-data-specification.md) | データ仕様（ER 図・スキーマ・ポータブル型） |
| 06 | [security-specification](docs/06-security-specification.md) | セキュリティ仕様（JWT・トークン保管・アップロード検証） |
| 07 | [api-specification](docs/07-api-specification.md) | API 仕様（エンドポイント・契約・Swagger UI） |
| 08 | [test-specification](docs/08-test-specification.md) | テスト仕様（各層の戦略・モック方針・カバレッジ） |
| 09 | [architecture-specification](docs/09-architecture-specification.md) | アーキテクチャ仕様（システム構成・静的配信/volume・技術スタック） |
| 10 | [miscellaneous-specification](docs/10-miscellaneous-specification.md) | その他（用語集・参照資料・付録: ポート/DB 切替/画像保存先） |
| 11 | [tasks](docs/11-tasks.md) | タスク・進捗・CI |
| 12 | [code-reading-guide](docs/12-code-reading-guide/README.md) | コードリーディングガイド（契約 → BE → FE → テストの読む順番。Step 別に分割） |

</details>

## ライセンス

[MIT License](LICENSE) © kojikawazu

> 学習用プロジェクトです。無保証（as-is）で提供します。
