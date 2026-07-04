---
description: JSDoc / コメント規約 — 型は書かず「意図・why」を残す。controller と application entry-point に JSDoc を付与
globs:
---

# JSDoc / コメント規約

型はシグネチャが唯一の真実（source of truth）。JSDoc は**型ではなく意図・意味・制約・why** を日本語で残す。全 export に機械的に付ける「JSDoc 義務化」はしない（自明な箇所への型再掲はノイズ）。**索引価値・非自明さがある箇所**に絞って付ける。

## 記述ルール（共通）

- **型ブレースを書かない**: `@param {string}` のような型併記は禁止（二重管理・型ずれの元）。型は TS シグネチャに任せる。
- **`@param` は dash スタイル**: `@param name - 説明`。名前は実引数名と一致させる（`eslint-plugin-jsdoc` の `check-param-names` が突き合わせる）。`@param name: ...` の colon 併記はパーサが名前を `name:` と誤認するため不可。型（`Type`）は説明文中に書いてよいが、型ブレース `{Type}` は書かない。
- **要約行必須**: 1 行目に「何をするか」を簡潔に。`@returns` は戻り値の意味＋（契約型なら）型の源を書く。
- **why コメント必須（public/内部・本番/テストを問わない）**: 型を欺く／仕様を迂回する箇所——`as unknown as` / `as any` / `@ts-expect-error` / マジック値 / 複雑な正規表現 / ワークアラウンド——は根拠（なぜ安全か／なぜ必要か）をコメントで残す（例: refresh トークンを SHA-256 でハッシュする理由、multer の `skipMagicNumbersValidation` の理由）。

## JSDoc を付ける対象（本リポジトリの house 慣習）

| 対象 | 付与内容 |
|---|---|
| **controller のハンドラ（全メソッド）** | 概要 / 実API（フルルート）/ 処理の実体（委譲先 usecase・ファイルパス）/ `@param` / `@returns`（型の源: `@app/api-client` ← `packages/api-spec/main.tsp`）。薄い委譲層の**索引**として機能させる。 |
| **application の entry-point（usecase / query / query-service / validator / service の `execute` 等）** | 処理の要点（ロード→適用→保存 等の流れ・404/403 の区別・保存有無）＋ `@param` / `@returns`。 |
| **composable / util（frontend）** | 副作用・検証の意図が非自明なら付与（例: レスポンスの zod 検証で壊れた形を 500 で弾く、等）。 |

**任意 / 一行で足りる対象**: mapper・port（interface）・entity・DTO スキーマ・自明な 1 行ユースケースは、クラス直上の一行コメントで intent を書けば十分（`execute` への @param/@returns 再掲は不要）。

## Lint による強制（`eslint-plugin-jsdoc`）

`eslint.config.mjs` で対象を絞って強制する（`pnpm lint` / CI で検出）。全 export への機械的必須化はしない（ノイズになるため）。

- **対象ファイル**: `apps/backend-*/src/**/*.controller.ts` と `apps/backend-*/src/**/application/**/*.{usecase,query,query-service,validator}.ts`
- **必須化**: `jsdoc/require-jsdoc`（`MethodDefinition`・`checkConstructors: false` で constructor は除外）/ `require-param` / `require-param-description` / `check-param-names`（名前一致）/ `require-returns` / `require-returns-description`
- **TypeScript 向け**: `jsdoc/require-param-type` / `require-returns-type` は **off**（型はシグネチャが真実）
- スコープ外（mapper / port / entity / DTO / service の private helper / frontend）は enforce しない。書く場合も上記の記述ルールに従う。
