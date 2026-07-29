# API specification instructions

親ディレクトリの `AGENTS.md` に加え、`packages/api-spec/**` を変更する前に `../../.claude/rules/coding-standards.md` を読んで守ってください。

`main.tsp` は API 契約の唯一の正本です。契約を変更する場合は `docs/07-api-specification.md` を同じ変更セットで更新し、`pnpm api:gen` で OpenAPI と型/クライアントを再生成して、利用側への影響を確認します。
