/** JwtAuthGuard 通過後に request.user に入る形 */
export interface AuthenticatedUser {
  userId: string;
  email: string;
}

/** アクセストークンの payload */
export interface AccessTokenPayload {
  sub: string;
  email: string;
}

/** リフレッシュトークンの payload */
export interface RefreshTokenPayload {
  sub: string;
  /** トークン一意化用 ID（ローテーションで毎回変わる） */
  jti?: string;
}
