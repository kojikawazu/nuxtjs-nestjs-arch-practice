/**
 * URL の安全判定ユーティリティ。
 *
 * Vue の `:href` バインディングは `javascript:` 等の危険スキームをサニタイズしない。
 * そのため「リンクとして描画してよいか」をここで一元判定し、http/https のみを許可する。
 */

const SAFE_PROTOCOLS = ['http:', 'https:'];

/** 値が http/https の URL として解釈でき、リンク描画して安全なら true。 */
export function isSafeHttpUrl(value?: string | null): boolean {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return SAFE_PROTOCOLS.includes(parsed.protocol);
  } catch {
    return false;
  }
}

/** 安全な URL からホスト名を取り出す。解釈できなければ元の文字列を返す。 */
export function safeUrlHost(value: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}
