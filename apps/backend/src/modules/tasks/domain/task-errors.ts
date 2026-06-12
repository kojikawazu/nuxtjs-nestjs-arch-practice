/**
 * ドメイン層のエラー（domain 層）。
 *
 * ここでは HTTP も NestJS も知らない。「業務ルール上ありえない状態」を表現するだけで、
 * これを 404/403/400 等の HTTP 応答へ翻訳するのは presentation 層の責務
 * （presentation/domain-exception.filter.ts）。
 *
 * こうして「ドメインは配信方式に依存しない」を保つことで、同じドメインを
 * HTTP 以外（CLI・キュー消費など）から呼んでも再利用できる。
 */
export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    // Error を継承する際の prototype 復元（TS の既知の作法）
    this.name = new.target.name;
  }
}

/** 対象タスクが存在しない（→ 404 Not Found）。 */
export class TaskNotFoundError extends DomainError {
  constructor() {
    super('Task not found');
  }
}

/** 他人のタスクを操作しようとした（→ 403 Forbidden）。 */
export class TaskAccessDeniedError extends DomainError {
  constructor() {
    super('You do not own this task');
  }
}

/** 終了日が開始日より前（→ 400 Bad Request）。 */
export class InvalidDateRangeError extends DomainError {
  constructor() {
    super('endDate must be on or after startDate');
  }
}

/** 許可されていない画像 MIME（→ 400 Bad Request）。 */
export class UnsupportedImageTypeError extends DomainError {
  constructor() {
    super('Unsupported image type');
  }
}
