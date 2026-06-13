# Nuxt frontend イメージ（本番ビルド出力を Nitro node サーバで配信）。
# ビルドコンテキストはリポジトリルート（モノレポ全体）。
FROM node:24-slim

RUN corepack enable
WORKDIR /repo

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @app/api-spec build \
  && pnpm --filter @app/api-client generate \
  && pnpm --filter @app/frontend-ssr build

WORKDIR /repo/apps/frontend-ssr
EXPOSE 3010
ENV PORT=3010
CMD ["node", ".output/server/index.mjs"]
