/**
 * DTO スキーマで共有する zod ヘルパー。
 */

/** ISO 8601 の日付（`2026-01-01`）または日時（`2026-06-10T00:00:00.000Z`）を許可する正規表現。 */
const ISO_8601 = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;

/** 値が ISO 8601 の日付/日時文字列として妥当なら true（旧 `@IsISO8601()` 相当）。 */
export function isIso8601(value: string): boolean {
  return ISO_8601.test(value) && !Number.isNaN(Date.parse(value));
}

const SAFE_PROTOCOLS = ['http:', 'https:'];

/**
 * 値が http/https の URL として解釈できれば true（旧 `@IsUrl({ protocols: ['http','https'] })` 相当）。
 * `javascript:` / `data:` 等の危険スキームは false（→ 400）。
 */
export function isHttpUrl(value: string): boolean {
  try {
    return SAFE_PROTOCOLS.includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
