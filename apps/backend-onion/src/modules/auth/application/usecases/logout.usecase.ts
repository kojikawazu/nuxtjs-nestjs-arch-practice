import { Inject, Injectable } from '@nestjs/common';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository';

/** ログアウト（ユーザーのリフレッシュトークンをすべて失効させる）。 */
@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  /**
   * 対象ユーザーのリフレッシュトークンをすべて失効させる。
   * @param userId - string（@CurrentUser 由来のユーザー ID）
   * @returns Promise<void>
   */
  async execute(userId: string): Promise<void> {
    await this.refreshTokens.deleteAllForUser(userId);
  }
}
