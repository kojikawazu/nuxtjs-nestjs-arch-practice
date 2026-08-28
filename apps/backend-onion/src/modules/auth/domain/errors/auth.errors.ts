import { DomainError } from '../../../../shared/domain/errors/domain-error';

/**
 * auth ドメインの業務エラー。NestJS の HttpException ではなく `DomainError` を継承し、
 * フレームワーク非依存に保つ（HTTP への変換はフィルタが kind を見て行う）。
 */

/** メール重複（登録時）。HTTP では 409。 */
export class EmailAlreadyRegisteredError extends DomainError {
  readonly kind = 'conflict' as const;
  constructor() {
    super('Email already registered');
    this.name = 'EmailAlreadyRegisteredError';
  }
}

/** 認証情報の不一致（ログイン時）。ユーザー有無を漏らさないため未登録も同一エラーにする。HTTP では 401。 */
export class InvalidCredentialsError extends DomainError {
  readonly kind = 'unauthorized' as const;
  constructor() {
    super('Invalid credentials');
    this.name = 'InvalidCredentialsError';
  }
}

/** リフレッシュトークンが無効（署名不正・該当なし・ユーザー消失）。HTTP では 401。 */
export class InvalidRefreshTokenError extends DomainError {
  readonly kind = 'unauthorized' as const;
  constructor() {
    super('Invalid refresh token');
    this.name = 'InvalidRefreshTokenError';
  }
}
