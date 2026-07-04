import { Inject, Injectable } from '@nestjs/common';
import type { AuthTokens } from '@app/api-client';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../users/domain/repositories/user.repository';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository';
import { InvalidCredentialsError } from '../../domain/auth.errors';
import { PASSWORD_HASHER, type PasswordHasher } from '../../domain/services/password-hasher';
import { TOKEN_ISSUER, type TokenIssuer } from '../../domain/services/token-issuer';
import type { LoginInput } from '../inputs/login.input';
import { issueAuthTokens } from '../issue-auth-tokens';

/** ログイン（メール照合 → パスワード検証 → トークン発行）。ユーザー有無は漏らさない。 */
@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(TOKEN_ISSUER) private readonly tokenIssuer: TokenIssuer,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  /**
   * メール照合 → パスワード検証 → トークン発行（不一致・不在はどちらも 401＝列挙防止）。
   * @param input - LoginInput（Controller が契約 LoginRequest から変換した Command）
   * @returns Promise<AuthTokens>（access/refresh。源: @app/api-client ← packages/api-spec/main.tsp）
   */
  async execute(input: LoginInput): Promise<AuthTokens> {
    const user = await this.users.findByEmail(input.email);
    if (!user) {
      // ユーザー有無を漏らさないため、存在しない場合も同じエラーにする
      throw new InvalidCredentialsError();
    }
    const matched = await this.hasher.compare(input.password, user.passwordHash);
    if (!matched) {
      throw new InvalidCredentialsError();
    }
    return issueAuthTokens(this.tokenIssuer, this.refreshTokens, user);
  }
}
