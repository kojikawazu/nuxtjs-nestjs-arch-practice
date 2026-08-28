import type { AuthTokens } from '@app/api-client';
import { toContractUser } from '../../../users/application/mappers/user.mapper';
import type { User } from '../../../users/domain/entities/user';
import type { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import type { TokenIssuer } from '../../domain/services/token-issuer';

/**
 * アクセス／リフレッシュトークンを発行し、リフレッシュを保存して {@link AuthTokens} を組み立てる
 * 共有ヘルパー（register / login / refresh の各ユースケースが再利用する）。
 *
 * 契約（{@link TokenIssuer} / {@link RefreshTokenRepository}）にのみ依存し、JWT・ハッシュ方式は知らない。
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
