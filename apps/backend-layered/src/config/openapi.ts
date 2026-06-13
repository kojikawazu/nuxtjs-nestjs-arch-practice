import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { OpenAPIObject } from '@nestjs/swagger';

/**
 * TypeSpec が生成した OpenAPI (`packages/api-spec/tsp-output/openapi.yaml`) を読み込む。
 * 契約を単一の真実とするため、Swagger UI はこの生成物をそのまま配信する。
 * 実行場所（dev / dist / Docker）に依存しないよう複数候補を探索する。
 */
export function loadOpenApiDocument(): OpenAPIObject | null {
  const candidates = [
    resolve(process.cwd(), '../../packages/api-spec/tsp-output/openapi.yaml'),
    resolve(__dirname, '../../../../packages/api-spec/tsp-output/openapi.yaml'),
  ];
  for (const path of candidates) {
    if (existsSync(path)) {
      return parseYaml(readFileSync(path, 'utf8')) as OpenAPIObject;
    }
  }
  return null;
}
