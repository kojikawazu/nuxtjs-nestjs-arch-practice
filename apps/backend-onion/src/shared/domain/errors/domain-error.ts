/**
 * ドメイン例外の基底（共有カーネル）。
 *
 * クリーンアーキテクチャでは、ドメイン/アプリケーション層は HTTP を知らない。
 * そこで業務エラーはこの `DomainError` として投げ、`kind`（業務的な分類）だけを持たせる。
 * HTTP ステータスへの変換は最外層の例外フィルタ（presentation 境界）が担う。
 * → 内側は transport 非依存のまま、外側が transport へ翻訳する（依存方向は外→内）。
 */
export type DomainErrorKind = 'not_found' | 'forbidden' | 'invalid' | 'conflict' | 'unauthorized';

export abstract class DomainError extends Error {
  abstract readonly kind: DomainErrorKind;

  /**
   * 破れた不変条件が属するドメイン属性名（例: `endDate`）。フィルタが `ApiError.errors` へ展開する。
   * ここで名乗るのは domain 自身の属性名であり、presentation の語彙ではない
   * （`TaskState` が `startDate` / `endDate` を持つ。契約が同名なのは結果であって依存ではない）。
   */
  readonly fields?: readonly string[];
}
