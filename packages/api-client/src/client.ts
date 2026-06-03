import createClient, { type Client, type ClientOptions } from 'openapi-fetch';
import type { paths } from './generated/schema';

/**
 * 型安全な API クライアントを生成する。
 *
 * openapi-fetch は OpenAPI の `paths` 型から、パス・メソッド・リクエスト/レスポンスを
 * すべて推論する。契約（TypeSpec）が変わればコンパイルエラーで検知できる。
 *
 * @param options baseUrl や fetch、共通ヘッダなど。テストでは `fetch` を差し替えて I/O をモックする。
 */
export function createApiClient(options: ClientOptions): Client<paths> {
  return createClient<paths>(options);
}

export type ApiClient = Client<paths>;
