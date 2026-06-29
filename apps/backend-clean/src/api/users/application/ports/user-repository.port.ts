import type { NewUser, User } from '../../domain/user';

/** DI トークン（interface は実行時に消えるため Symbol で provide/inject する）。 */
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

/**
 * ユーザー永続化の Port（依存性逆転の境界）。
 *
 * application 層（users 自身・auth の各ユースケース）はこの interface にのみ依存し、
 * TypeORM を知らない。実装は infrastructure 層（TypeOrmUserRepository）が提供し、DI で注入する。
 */
export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(input: NewUser): Promise<User>;
}
