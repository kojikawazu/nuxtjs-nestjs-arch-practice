import { Inject, Injectable } from '@nestjs/common';
import type { AuthTokens } from '@app/api-client';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../users/application/ports/user-repository.port';
import { InvalidRefreshTokenError } from '../../domain/auth.errors';
import { issueAuthTokens } from '../issue-auth-tokens';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../ports/refresh-token-repository.port';
import { TOKEN_ISSUER, type TokenIssuer } from '../ports/token-issuer.port';

/**
 * リフレッシュ（ローテーション）。
 * 署名検証 → 保存ハッシュ照合 → ユーザー存在確認 → 旧トークン失効 → 新規発行。
 * いずれの失敗も `InvalidRefreshTokenError`（401）に集約する。
 */
@Injectable()
export class RefreshUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(TOKEN_ISSUER) private readonly tokenIssuer: TokenIssuer,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  /**
   * 署名検証 → 保存ハッシュ照合 → ユーザー存在確認 → 旧トークン失効 → 新規発行。失敗は 401 に集約。
   * @param token - string（クライアント提示のリフレッシュトークン）
   * @returns Promise<AuthTokens>（新しい access/refresh。源: @app/api-client ← packages/api-spec/main.tsp）
   */
  async execute(token: string): Promise<AuthTokens> {
    const payload = await this.tokenIssuer.verifyRefreshToken(token);
    if (!payload) {
      throw new InvalidRefreshTokenError();
    }
    const matched = await this.refreshTokens.findMatch(payload.userId, token);
    if (!matched) {
      throw new InvalidRefreshTokenError();
    }
    const user = await this.users.findById(payload.userId);
    if (!user) {
      throw new InvalidRefreshTokenError();
    }
    // ローテーション: 使用済みトークン行を削除してから新規発行する
    await this.refreshTokens.deleteById(matched.id);
    return issueAuthTokens(this.tokenIssuer, this.refreshTokens, user);
  }
}
