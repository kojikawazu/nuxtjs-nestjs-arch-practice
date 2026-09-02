import { DomainError } from '../../../../shared/domain/errors/domain-error';

/**
 * users ドメインの業務エラー。
 *
 * 「同じメールのユーザーは 2 人存在しない」は **users 側の不変条件**で、それを実際に保証しているのは
 * `users.email` の一意制約。auth の登録ユースケースはこの不変条件の破れを受け取る側にすぎないため、
 * エラーの所有者は users にする（Port `UserRepository.create` が投げうるものは Port と同じ feature が持つ）。
 * auth → users の依存は既にある向きなので、これで依存が逆流することもない。
 */

/** メール重複（既に同じメールのユーザーが居る）。HTTP では 409。 */
export class EmailAlreadyRegisteredError extends DomainError {
  readonly kind = 'conflict' as const;
  constructor() {
    super('Email already registered');
    this.name = 'EmailAlreadyRegisteredError';
  }
}
