/**
 * ドメイン例外の基底（共有カーネル）。
 *
 * クリーンアーキテクチャでは、ドメイン/アプリケーション層は HTTP を知らない。
 * そこで業務エラーはこの `DomainError` として投げ、`kind`（業務的な分類）だけを持たせる。
 * HTTP ステータスへの変換は最外層の例外フィルタ（presentation 境界）が担う。
 * → 内側は transport 非依存のまま、外側が transport へ翻訳する（依存方向は外→内）。
 */
export type DomainErrorKind = 'not_found' | 'forbidden' | 'invalid';

export abstract class DomainError extends Error {
  abstract readonly kind: DomainErrorKind;
}
