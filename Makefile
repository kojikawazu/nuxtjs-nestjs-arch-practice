# タスク管理アプリ用 Makefile。
# 既存の pnpm scripts / docker compose の薄いショートカット（ロジックは二重化しない）。
.DEFAULT_GOAL := help
.PHONY: help install gen lint format typecheck test test-back test-back-e2e test-back-it test-scenario-mysql test-front test-e2e dev-back dev-front db-up up down reset logs ps

help: ## このヘルプを表示
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "} {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

## ───────── セットアップ / 生成 ─────────
install: ## 依存をインストール
	pnpm install

gen: ## API 契約から型/クライアントを生成 (TypeSpec→OpenAPI)
	pnpm api:gen

## ───────── 品質 ─────────
lint: ## ESLint
	pnpm lint

format: ## Prettier 整形
	pnpm format

typecheck: ## 全パッケージの型チェック
	pnpm -r typecheck

## ───────── テスト ─────────
test: test-back test-back-e2e test-front ## BE 単体+e2e と FE 単体をまとめて実行

test-back: ## backend 単体テスト (Jest)
	pnpm --filter @app/backend-layered test

test-back-e2e: ## backend e2e テスト (supertest / SQLite)
	pnpm --filter @app/backend-layered test:e2e

test-back-it: ## backend IT (DB 忠実性 / MySQL コンテナが healthy になるまで待って 3 版を実行)
	docker compose --profile test up -d --wait mysql-test
	pnpm --filter @app/backend-layered test:it
	pnpm --filter @app/backend-clean test:it
	pnpm --filter @app/backend-onion test:it

test-front: ## frontend 単体テスト (Vitest)
	pnpm --filter @app/frontend-spa test

test-e2e: ## frontend 全体 E2E (Playwright / SQLite・速いスモーク)
	pnpm --filter @app/frontend-spa test:e2e

test-scenario-mysql: ## FE+BE 通しシナリオを MySQL コンテナで (本番相当・taskdb_e2e)
	docker compose --profile test up -d --wait mysql-test
	SCENARIO_DB=mysql pnpm --filter @app/frontend-spa test:e2e

## ───────── 開発サーバ ─────────
dev-back: ## backend dev サーバ起動
	pnpm --filter @app/backend-layered dev

dev-front: ## frontend dev サーバ起動
	pnpm --filter @app/frontend-spa dev

## ───────── Docker ─────────
db-up: ## MySQL のみ起動
	pnpm db:up

up: ## 全スタックをビルドして起動 (mysql + backend + frontend)
	docker compose up -d --build

down: ## 全スタックを停止 (データは保持)
	docker compose down

reset: ## 全スタックを停止しデータも削除
	docker compose down -v

logs: ## コンテナのログを追従
	docker compose logs -f

ps: ## コンテナの状態を表示
	docker compose ps
