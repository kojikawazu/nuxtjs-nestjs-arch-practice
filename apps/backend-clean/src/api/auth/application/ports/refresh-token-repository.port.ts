/** DI トークン。 */
export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');

/** 照合できた保存済みリフレッシュトークン（ローテーションで行を特定するための id）。 */
export interface StoredRefreshToken {
  id: string;
  userId: string;
}

/**
 * リフレッシュトークン永続化の Port。
 *
 * 「平文を保存しない（SHA-256 ハッシュ化）」「定数時間比較で照合する」といった保管の詳細は
 * **実装（infrastructure）の責務**として隠蔽し、application は生トークンを渡すだけにする。
 * → ユースケースはハッシュ方式を一切知らない（保管戦略の差し替えが application に波及しない）。
 */
export interface RefreshTokenRepository {
  /** 生トークンをハッシュ化して保存する（期限切れの古い行も掃除する）。 */
  save(userId: string, token: string, expiresAt: Date): Promise<void>;

  /** ユーザーの保存済みトークンから生トークンに一致する行を定数時間比較で探す。無ければ null。 */
  findMatch(userId: string, token: string): Promise<StoredRefreshToken | null>;

  /** 指定 id の行を削除する（ローテーションで使用済みトークンを失効）。 */
  deleteById(id: string): Promise<void>;

  /** ユーザーの全リフレッシュトークンを失効させる（ログアウト）。 */
  deleteAllForUser(userId: string): Promise<void>;
}
