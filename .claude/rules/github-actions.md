---
description: GitHub Actions のルール — ワークフローの静的解析（actionlint）と発火設計
globs: .github/workflows/**
---

# GitHub Actions のルール

ワークフローの誤りは「push して実際に動かすまで気づけない」。CI 時間を溶かす前に機械で潰す。

## ワークフローの静的解析（actionlint）

**ワークフローを追加・変更したら actionlint が通ることを CI で必須にする**（`ci.yml` の `actionlint` ジョブ）。

検出できるもの:

| 検出内容 | 例 |
|---|---|
| ランナーラベルの誤り | `runs-on: ubuntu-lates`（typo） |
| アクション入力名の誤り | `actions/checkout@v4` に `fetch-dept:`（正: `fetch-depth`） |
| 式・コンテキストの誤り | 存在しない `steps.<id>.outputs.*` の参照、型の不一致 |
| ジョブ依存の誤り | `needs:` が存在しないジョブ ID を指している |
| スクリプトインジェクション | `run: echo "${{ github.event.pull_request.title }}"` のように untrusted input を `run:` へ直接埋め込む |
| **`run:` の中身**（shellcheck 連携） | クォート漏れ・未定義変数・パイプの終了コード |

**検出できないもの**（レビューで見る）: パスフィルタの内容が意図と合っているか、参照しているシークレットが実在するか、ジョブの順序が業務的に正しいか。

### 取得方法は Docker イメージのタグ固定にする（変更前に必読）

actionlint は `run:` の中身を取り出して**外部の `shellcheck` バイナリ**へ渡す設計で、PATH に無い場合は**エラーにも警告にもならず、その層だけ静かにスキップされる**（終了コードは 0 のまま）。`brew install actionlint` / `go install` は shellcheck を連れてこないため、バイナリ直取得にすると上表の最終行——**レビューで最も見落とされる層**——が黙って抜ける。

公式イメージ（`rhysd/actionlint:<tag>`）は shellcheck / pyflakes を同梱するため、CI と手元が文字列レベルで同じ検査になる。**バイナリ直取得へ変えない**。変えるなら shellcheck の導入を手順に含め、`run:` の検査が実際に発火することを確認してから行う。

- **バージョンはイメージタグで固定する**。`latest` にすると、コードを変えていないのに新リリースの検査強化で CI が落ちる。
- **`actions/checkout` を必ず先に置く**。actionlint は `.git` からリポジトリルートを判定する。
- **Node の依存は不要**（`pnpm install` を走らせない）。`pnpm` 本体だけあれば `pnpm lint:workflows` を呼べる。

## コマンドの定義は 1 箇所に置く

**検査コマンドの実体は `package.json` の scripts に置き、CI と `Makefile` の双方がそれを呼ぶ**。CI に直接コマンドを書くと、手元と CI で別のバージョン・別の引数になっても誰も気づけない。

| 検査 | 実体 | CI | 手元 |
|---|---|---|---|
| ワークフロー | `package.json` の `lint:workflows` | `pnpm lint:workflows` | `make lint-workflows` |
| Markdown | `package.json` の `lint:md` | `pnpm lint:md` | `make lint-md` |

バージョンは **lockfile（markdownlint-cli2）とイメージタグ（actionlint）が保証**する。

## 発火設計

- **CI は `pull_request` と `main` への `push` で起動する**。全ブランチの push では回さない（PR で回れば十分）。
- **`concurrency` を設定する**。同一参照への連続 push で古い実行をキャンセルする。
- **`permissions` は最小権限**を明示する（既定の広い権限に依存しない）。

### 必須チェックをワークフローレベルの `paths` で止めない

**ワークフロー自体が起動しないと、必須チェックは `pending` のまま完了せず PR がマージできなくなる**。一方、**ジョブレベルの `if:` によるスキップは「skipped」＝成功扱い**になる。

したがって必須チェックにするジョブは「**常に起動し、中身をスキップする**」形にする。本リポジトリは `changes` ジョブ（`dorny/paths-filter`）＋ ジョブレベル `if:` でこれを実現している。

### 軽量な検査は分岐させず常時実行する

`actionlint` / `docs`（markdownlint）/ `secret-scan` は `changes` に依存させず**全 PR で常時実行**する。

- いずれも数秒で終わり、判定ジョブの結果を待つほうが高くつく。
- 検査対象（ワークフロー・Markdown・追跡ファイル）は**変更種別を問わず壊れうる**。とくに秘匿ファイルの混入は、どの分類の変更でも起こる。

### ドキュメント変更でも「何も動かさない」にはしない

`docs/**` や `*.md` のみの変更でテスト・ビルドは回さないが、**markdownlint は回す**。ドキュメントの壊れ（リンク切れ・見出し階層の飛び・表の描画崩れ）は差分を読むだけでは見つからない。

## レビュー観点

- ワークフローを変更する PR で actionlint が実行され、成功しているか。
- actionlint の取得方法がバイナリ直取得に変わっていないか（`run:` の検査が黙って抜ける）。
- 検査コマンドが CI に直書きされていないか（`package.json` の 1 箇所に定義されているか）。
- 必須チェックにするジョブが、ワークフローレベルの `paths` / `paths-ignore` で止められていないか。
- アプリコードを変更したのに必要なジョブがスキップされていないか（パスフィルタの書き漏れ）。
- `permissions` が明示され、最小権限になっているか。
