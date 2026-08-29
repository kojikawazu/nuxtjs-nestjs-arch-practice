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
 * `javascript:` / `data:` 等の危険スキームは false（→ 422）。
 */
export function isHttpUrl(value: string): boolean {
  try {
    return SAFE_PROTOCOLS.includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

/**
 * bcrypt が扱えるパスワードの最大バイト数。これを超えた分は**静かに切り捨てられる**。
 * 文字数ではなくバイト数なのが要点で、マルチバイト文字では両者が大きくずれる。
 */
export const BCRYPT_MAX_PASSWORD_BYTES = 72;

/**
 * 文字列の UTF-8 バイト長が上限以内なら true。
 *
 * パスワードの上限を `.max()`（文字数）で見ると bcrypt の制約と一致しない。
 * 例: 「あ」24 文字は 72 バイトちょうどだが、25 文字目を足した 73 バイトの別パスワードでも
 * bcrypt は先頭 72 バイトしか見ないため `compare` が成功してしまう。
 * 「利用者が入力したものと違う値でログインできる」状態を防ぐため、バイト長で判定する。
 */
export function isWithinUtf8Bytes(value: string, maxBytes: number): boolean {
  return Buffer.byteLength(value, 'utf8') <= maxBytes;
}
