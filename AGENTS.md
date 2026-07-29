# Codex instructions

このリポジトリでは `.claude/rules/` が開発ルールの唯一の正本です。作業を始める前に、変更対象に応じて次のルールを読み、守ってください。ルール本文をこのファイルへ複製しないでください。

## 常に適用するルール

- `.claude/rules/workflow.md`
- `.claude/rules/quality-gate.md`
- `.claude/rules/documentation.md`
- `.claude/rules/git.md`
- `.claude/rules/coding-standards.md`
- `.claude/rules/jsdoc.md`
- `.claude/rules/testing.md`
- `.claude/rules/commands.md`
- `.claude/rules/shortcuts.md`

## パス別ルール

より深いディレクトリの `AGENTS.md` がある場合は、ここに加えてその指示も適用します。

- `apps/backend-layered/**`: `apps/backend-layered/AGENTS.md`
- `apps/backend-clean/**`: `apps/backend-clean/AGENTS.md`
- `apps/backend-onion/**`: `apps/backend-onion/AGENTS.md`
- `apps/frontend-spa/**`: `apps/frontend-spa/AGENTS.md`
- `apps/frontend-ssr/**`: `apps/frontend-ssr/AGENTS.md`
- `packages/api-spec/**`: `packages/api-spec/AGENTS.md`
- `packages/api-client/**`: `packages/api-client/AGENTS.md`

## ルール構成を変更するとき

`.claude/rules/` の本文が唯一の正本です。ルールファイルの追加・削除・改名・適用範囲変更時は、同一変更で `CLAUDE.md`、該当する `AGENTS.md`、README の「AI エージェント向けルール」表を同期してください。ルール本文だけの変更では、これらの入口ファイルを更新する必要はありません。

## ショートカットの扱い

`.claude/rules/shortcuts.md` の意図は守る。ただし Claude 固有の機能名は、利用可能な Codex の機能・指示に読み替える。Codex は PR の承認・マージを実行しない。
