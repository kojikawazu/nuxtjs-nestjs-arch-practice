import { Inject, Injectable } from '@nestjs/common';
import type { AuthTokens } from '@app/api-client';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../users/application/ports/user-repository.port';
import { EmailAlreadyRegisteredError } from '../../domain/auth.errors';
import type { RegisterInput } from '../inputs/register.input';
import { issueAuthTokens } from '../issue-auth-tokens';
import { PASSWORD_HASHER, type PasswordHasher } from '../ports/password-hasher.port';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../ports/refresh-token-repository.port';
import { TOKEN_ISSUER, type TokenIssuer } from '../ports/token-issuer.port';

/** 新規登録（メール重複を弾き、パスワードをハッシュ化して作成 → トークン発行）。 */
@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(TOKEN_ISSUER) private readonly tokenIssuer: TokenIssuer,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  async execute(input: RegisterInput): Promise<AuthTokens> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new EmailAlreadyRegisteredError();
    }
    const passwordHash = await this.hasher.hash(input.password);
    const user = await this.users.create({
      email: input.email,
      passwordHash,
      displayName: input.displayName,
    });
    return issueAuthTokens(this.tokenIssuer, this.refreshTokens, user);
  }
}
