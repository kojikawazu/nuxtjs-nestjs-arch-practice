import { DomainError } from '../../../common/errors/domain-error';

/**
 * tasks ドメインの業務エラー。NestJS の HttpException ではなく `DomainError` を継承し、
 * フレームワーク非依存に保つ（HTTP への変換はフィルタが kind を見て行う）。
 */
export class TaskNotFoundError extends DomainError {
  readonly kind = 'not_found' as const;
  constructor() {
    super('Task not found');
    this.name = 'TaskNotFoundError';
  }
}

export class TaskAccessDeniedError extends DomainError {
  readonly kind = 'forbidden' as const;
  constructor() {
    super('You do not own this task');
    this.name = 'TaskAccessDeniedError';
  }
}

export class InvalidDateRangeError extends DomainError {
  readonly kind = 'invalid' as const;
  constructor() {
    super('endDate must be on or after startDate');
    this.name = 'InvalidDateRangeError';
  }
}

export class UnsupportedImageTypeError extends DomainError {
  readonly kind = 'invalid' as const;
  constructor() {
    super('Unsupported image type');
    this.name = 'UnsupportedImageTypeError';
  }
}
