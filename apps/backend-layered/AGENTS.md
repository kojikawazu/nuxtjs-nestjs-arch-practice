# Layered backend instructions

親ディレクトリの `AGENTS.md` に加え、`apps/backend-layered/**` を変更する前に `../../.claude/rules/stack-backend.md` を読んで守ってください。

HTTP 契約を変更する場合は、`packages/api-spec/main.tsp` と `docs/07-api-specification.md` を同じ変更セットで更新し、3 つの backend 実装で外部から見た挙動をそろえます。
