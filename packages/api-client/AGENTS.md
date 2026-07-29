# API client instructions

親ディレクトリの `AGENTS.md` に加え、`packages/api-client/**` を変更する前に `../../.claude/rules/coding-standards.md` を読んで守ってください。

`src/generated/` の型は `packages/api-spec/main.tsp` から `pnpm api:gen` で生成します。契約変更は生成物を直接編集せず、TypeSpec と `docs/07-api-specification.md` を更新して再生成してください。
