# テスト仕様書

テスト戦略・各層のテスト・ツールを定義する。原則は `.claude/rules/testing.md`。

## 目次

- [テスト戦略（テスト容易性を最優先に設計）](#テスト戦略テスト容易性を最優先に設計)
- [テスト層とコンテナ方針（UT / IT / E2E）](#テスト層とコンテナ方針ut--it--e2e)
- [テストケース方針](#テストケース方針)
- [カバレッジの要点（実装済み）](#カバレッジの要点実装済み)
- [テスト実行コマンド](#テスト実行コマンド)
- [既知の制約](#既知の制約)


## テスト戦略（テスト容易性を最優先に設計）

| 層 | ツール | モック対象 | 狙い |
|---|---|---|---|
| BE UseCase 単体（tasks 書き込み） | Jest | Repository(DB) のみ（画像系は fs も） | 認可(404/403)・日付検証・DryRun は永続化しない・画像命名を本物で検証 |
| BE Query 単体（tasks 読み取り・clean/onion） | Jest | 読み取り専用 Port `TaskQuery` のみ | CQRS Query 側の所有判定(404/403)・契約直射影を検証。書き込み Repository は注入しない（依存が痩せる） |
| BE Service 単体（auth/users） | Jest | Repository(DB) のみ | ビジネスロジック・認可・トークン回転を本物で検証 |
| BE 入力検証単体（3 版とも zod） | Jest | なし | `ZodValidationPipe`（400 翻訳）と各スキーマ（必須・列挙・ISO 日付・url は http/https・未知キー拒否）を本物の zod で検証 |
| BE e2e | Jest + supertest（in-memory SQLite） | なし | HTTP 境界・認可・バリデーション・エラーレスポンス |
| FE Composable `useTasks` | Vitest + **MSW** | backend への HTTP のみ | 副作用を Composable に閉じ込めた設計の検証 |
| FE Composable `useAuth` | Vitest + **registerEndpoint** | Nitro BFF (`/api/auth/*`) | トークンがメモリに入る/消えるロジック |
| FE Component | Vitest + Vue Test Utils | 子/HTTP | バリデーション・confirm/emit |
| 全体 E2E | **Playwright(chromium)** | なし（実スタック） | ユーザー視点の通しシナリオ |

## テスト層とコンテナ方針（UT / IT / E2E）

各層で「どこまでモックし、DB コンテナ（使い捨ての MySQL）をどこで使うか」の方針。判断軸は速度と本番忠実度のトレードオフ＝**忠実度が要る層だけコンテナ、速度が要る層はモック / SQLite**。本リポジトリは学習用のため、実装は速度優先の現状を保ちつつ、忠実度側を「目標状態」として定義する。

| 層 | BE | FE | DB / コンテナ |
|---|---|---|---|
| **UT（単体）** | usecase/query/service を Repository/Port モック（純粋計算 bcrypt/JWT/zod は実物） | component/composable を MSW / `registerEndpoint` でモック | なし・**コンテナ不要** |
| **IT（統合）** | **DB 忠実性**を MySQL コンテナで検証（照合順序・制約・型・将来のマイグレーション＝SQLite と結果が変わる領域） | component + composable の統合。**モックのまま**（DB を噛ませても得るものが無い） | BE=**MySQL コンテナ**（`taskdb_it`） / FE=なし |
| **E2E（配線/スモーク）** | supertest で HTTP フロー・認可・エラー形（DB エンジン非依存） | Playwright が実 BE を起動しブラウザで通す | **SQLite**（速い・毎 push） |
| **シナリオ（受け入れ）** | （FE 経由で実 BE を叩く） | Playwright が実 BE（`taskdb_e2e`）を起動しフル通し | **MySQL コンテナ**（本番相当・出荷ゲート） |

**原則**:

- **UT はモック・コンテナ不要**（速度が命）。FE の IT も component 統合なので**モックで十分**。
- **MySQL コンテナは「IT」と「シナリオ」の 2 箇所だけ**、役割を分けて 1 つの `mysql-test` を DB 名で二役に使う: **IT=「DB エンジンが正しいか」**（照合・制約＝SQLite と結果が変わる／`taskdb_it`）／ **シナリオ=「本番構成で製品が通るか」**（フルスタックの出荷ゲート／`taskdb_e2e`）。
- **BE e2e / FE e2e は SQLite**: 配線・認可・エラー形は DB エンジンに依存せず SQLite と MySQL で結果が変わらないため、速い代役で十分（MySQL にしても新しく分かることが無く冗長）。＝「**被験体なら本物、道具なら代役**」。
- 学習用のため単速でよい（毎回コンテナ 1 つ）。速度重視なら「毎 push=SQLite ／ pre-merge=MySQL」の 2 速も選べる。

**現状（実装済み）と目標の差分**:

- **現状（既定）**: BE e2e / FE E2E とも **in-memory SQLite（`better-sqlite3` `:memory:`）** で動き、**Docker 不要**（clone 直後に `pnpm test` が即通る）。この「外部依存ゼロ」は速度・可搬性の利点として維持する（`pnpm test` / CI は SQLite のまま）。
- **実装済み（BE IT・3 版）**: `backend-layered` / `backend-clean` / `backend-onion` の各 `test/it/db-fidelity.it-spec.ts` に **DB 忠実性 IT** を追加。MySQL の**照合順序（`utf8mb4_0900_ai_ci`＝大文字小文字を区別しない）**と **email の unique 制約**を検証し、SQLite（既定 BINARY 比較）では踏めない差を実演する（接続先 DB は `taskdb_it`）。実行は `make test-back-it`（= `mysql-test` を `--wait` で healthy まで待って 3 版の `test:it` を順に実行）。
- **実装済み（シナリオの MySQL コンテナ化・二役）**: Playwright の webServer が起動する backend を `SCENARIO_DB=mysql` で **`mysql-test` の `taskdb_e2e`** に繋ぎ、**実ブラウザ + 実 FE + 実 BE + 実 MySQL** の通しシナリオを本番相当で回す。**IT=`taskdb_it` / シナリオ=`taskdb_e2e` を同一コンテナで二役**（`docker/mysql-test-init.sql` が両 DB を作成）。実行は `make test-scenario-mysql`（代表 spa。既定 `test:e2e` は従来どおり SQLite・速い）。
- **既定の速いテストは SQLite・Docker 不要**: `pnpm test`・BE `test:e2e`（supertest）・FE `test:e2e`（Playwright）はすべて SQLite（`.it-spec` は unit/e2e の testRegex 外）。ローカルの MySQL 経路は `make test-back-it`（IT）/ `make test-scenario-mysql`（シナリオ）。
- **CI は両方回す**: SQLite ジョブ（`backend` の unit+e2e / `frontend` / `e2e` Playwright）に加え、**`backend-it`**（DB 忠実性 IT を MySQL コンテナで・3 版）と **`scenario-mysql`**（FE+BE 通しシナリオを MySQL コンテナで・spa）の 2 ジョブ。ローカルと同じ `make` 手順・ubuntu ランナーの docker compose を利用。
- **目標（残り）**: `synchronize` を捨てた**本番マイグレーション検証**（実 MySQL でしか踏めない領域。[docs/11](./11-tasks.md) の「本番向けマイグレーション運用」に接続）。
- **学習的な意味**: 「SQLite（速い）で回すテスト」と「MySQL コンテナ（本番忠実）で回すテスト」の対比自体が、本リポジトリの比較テーマ（同一挙動を別条件で検証）に沿った教材になる。

## テストケース方針

- 正常系 1 : 準正常系+異常系 2 以上（`testing.md`）。
- 具体値でアサート（曖昧な `toBeTruthy()` を避ける）。
- ビジネスロジックはモックしない。モックは外部 I/O のみ。

## カバレッジの要点（実装済み）

- 認証: 登録/重複(409)/ログイン失敗(401)/リフレッシュ回転/旧トークン無効化。
- タスク: CRUD/未認証(401)/他人のタスク(403)/不存在(404)/バリデーション(400)。
- DryRun（検証のみ）: register/tasks の `*/validate` で 200/400/409/403/404/401 を検証。
  e2e では **検証後に本登録が成功（重複にならない）/ GET で内容不変**を確認し「書き込みが起きていない」ことを保証。単体では `users.create`/`tasks.save` が**呼ばれない**ことをアサート。
- 日付範囲: `startDate` 必須（未指定→400）、`endDate` 任意、`startDate ≤ endDate`（逆転→400）。更新はマージ後の値で検証。FE は TaskForm のクライアント側検証（開始必須・開始≤終了）と flatpickr UI を Playwright で確認（flatpickr は単体では `vi.mock`）。
- 関連 URL（任意・http/https のみ）:
  - BE 単体: `create`/`update` で `url` が保存・契約 Task に反映されること、未指定時は null になること。
  - BE e2e: 有効な `https://` URL → 201 で反映、`javascript:alert(1)` / 2048 文字超 → 400。
  - FE 単体: `UrlPreview` が http/https のみ `<a>`（`rel="noopener noreferrer"`）を描画し、`javascript:`/`data:` ではリンクを出さない（描画時ガード）。`TaskForm` は不正スキームを submit させない。`useTasks` は `url` を含む body を POST する。
  - E2E: URL 入力 → 確認画面に `url-preview-link` 表示 → 作成後の詳細でも安全なリンクとして表示。
- 画像アップロード（1枚・任意）:
  - BE 単体: `setImage`/`removeImage` で **fs（外部I/O）のみモック**。サーバ生成ファイル名・旧ファイル削除・未対応MIME(400)・404/403 を検証（`writeFile`/`save` が呼ばれないこともアサート）。
  - BE e2e: `POST /tasks/{id}/image` を supertest `.attach` で検証。正常(添付→`GET /uploads/<file>` 200→削除で 404)、不正MIME/超過/ファイル無し(400)、404/403/401。`UPLOAD_DIR` は OS 一時ディレクトリに隔離（外部依存なし）。
  - FE 単体: `useTasks.uploadImage/removeImage`（MSW で multipart を横取り、Bearer 付与を確認）、TaskForm のファイル選択（imageFile emit・非対応MIMEのクライアント検証）。
  - E2E: 画像添付で作成→詳細で表示・実ロード（`naturalWidth>0`）まで確認。

## テスト実行コマンド

```bash
pnpm --filter @app/backend-layered test       # BE 単体(Jest)
pnpm --filter @app/backend-layered test:e2e   # BE e2e(supertest / SQLite)
pnpm --filter @app/backend-layered test:it    # BE IT(DB忠実性 / MySQL コンテナ・要 mysql-test 起動) ※make test-back-it 推奨
pnpm --filter @app/backend-clean test          # BE(clean) 単体(Jest)
pnpm --filter @app/backend-clean test:e2e      # BE(clean) e2e(supertest) ※layered と同一シナリオ
pnpm --filter @app/backend-onion test          # BE(onion) 単体(Jest)
pnpm --filter @app/backend-onion test:e2e      # BE(onion) e2e(supertest) ※layered と同一シナリオ
make test-scenario-mysql                        # FE+BE 通しシナリオを MySQL コンテナ(taskdb_e2e)で実行 ※本番相当・IT(taskdb_it)と DB 名で二役
pnpm --filter @app/frontend-spa test      # FE(SPA) 単体(Vitest)
pnpm --filter @app/frontend-spa test:e2e  # FE(SPA) 全体 E2E(Playwright, ビルド→起動→実行)
pnpm --filter @app/frontend-ssr test      # FE(SSR) 単体(Vitest)
pnpm --filter @app/frontend-ssr test:e2e  # FE(SSR) 全体 E2E(Playwright) ※spa と同一シナリオ
```

> `backend-clean` / `backend-onion` は `backend-layered` と**同一の e2e シナリオ**が通る（同じ API 契約の別アーキ実装）。CI でも matrix で 3 版すべてを実行する。
> `frontend-ssr` も `frontend-spa` と**同一の E2E シナリオ**が通る（SPA/SSR で挙動は同一）。CI の frontend 単体・E2E ジョブも matrix で両方を実行する。

## 既知の制約

- backend e2e と Playwright は外部依存なしで動くよう SQLite を使用（本番は MySQL）。
- Playwright は dev サーバ（Vite7 非互換）を避け、本番ビルド出力を起動して検証する。
- compose の `mysql-test`（MySQL での e2e 用使い捨て DB）は `test` profile に隔離。無印 `docker compose up` では起動せず、必要時のみ `docker compose --profile test up mysql-test` で起動する。
