/**
 * 確認画面へ持ち回す draft のサイズ判定。
 *
 * SSR 版は draft を Cookie に載せるため、ブラウザの Cookie 上限（1 本あたり約 4KB）に縛られる。
 * 超過分は**エラーにならず黙って破棄**されるので、クライアント（入力中の警告）とサーバ（最終防御）の
 * 双方で同じ基準を使う必要がある。そのため判定ロジックをここに集約し、両方から参照する。
 */

/** Cookie 名・属性のオーバーヘッド分を引いた安全マージン。 */
export const MAX_DRAFT_BYTES = 3500;

/**
 * Cookie 値としての実効バイト長を返す。
 * Cookie は送出時に URL エンコードされるため、生の JSON 長ではなく**エンコード後**で測る
 * （日本語 1 文字は `%E3%81%82` の 9 文字に膨らむので、生の長さで測ると上限を大幅に超過する）。
 */
export function draftByteLength(draft: unknown): number {
  return encodeURIComponent(JSON.stringify(draft)).length;
}

/** draft が Cookie 上限を超えるか。 */
export function isDraftTooLarge(draft: unknown): boolean {
  return draftByteLength(draft) > MAX_DRAFT_BYTES;
}
