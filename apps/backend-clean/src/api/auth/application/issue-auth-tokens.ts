import type { AuthTokens } from '@app/api-client';
import { toContractUser } from '../../users/application/user.mapper';
import type { User } from '../../users/domain/user';
import type { RefreshTokenRepository } from './ports/refresh-token-repository.port';
import type { TokenIssuer } from './ports/token-issuer.port';

/**
 * アクセス／リフレッシュトークンを発行し、リフレッシュを保存して {@link AuthTokens} を組み立てる
 * 共有ヘルパー（register / login / refresh の各ユースケースが再利用する）。
 *
 * Port（{@link TokenIssuer} / {@link RefreshTokenRepository}）にのみ依存し、JWT・ハッシュ方式は知らない。
 */
export async function issueAuthTokens(
  tokenIssuer: TokenIssuer,
  refreshTokens: RefreshTokenRepository,
  user: User,
): Promise<AuthTokens> {
  const accessToken = await tokenIssuer.issueAccessToken({ id: user.id, email: user.email });
  const refresh = await tokenIssuer.issueRefreshToken(user.id);
  await refreshTokens.save(user.id, refresh.token, refresh.expiresAt);
  return {
    accessToken,
    refreshToken: refresh.token,
    user: toContractUser(user),
  };
}
