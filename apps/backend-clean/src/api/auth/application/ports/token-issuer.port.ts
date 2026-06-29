/** DI トークン。 */
export const TOKEN_ISSUER = Symbol('TOKEN_ISSUER');

/** 発行したリフレッシュトークンと、その有効期限（永続化に使う）。 */
export interface IssuedRefreshToken {
  token: string;
  expiresAt: Date;
}

/**
 * トークン発行・検証の Port（JWT ライブラリ・秘密鍵・有効期限・jti の詳細を隠す）。
 *
 * application 層は「アクセストークン文字列」「リフレッシュトークン文字列」を抽象的に扱い、
 * 署名アルゴリズム・secret・expiresIn・jti・exp 抽出といった JWT 固有の事情を知らない。
 * 実装は infrastructure（JwtTokenIssuer）が提供する。
 */
export interface TokenIssuer {
  /** アクセストークン（短命）を発行する。 */
  issueAccessToken(user: { id: string; email: string }): Promise<string>;

  /** リフレッシュトークン（長命・jti で一意化）を発行し、有効期限を添えて返す。 */
  issueRefreshToken(userId: string): Promise<IssuedRefreshToken>;

  /** リフレッシュトークンを検証し、所有ユーザー id を返す。無効なら null。 */
  verifyRefreshToken(token: string): Promise<{ userId: string } | null>;
}
