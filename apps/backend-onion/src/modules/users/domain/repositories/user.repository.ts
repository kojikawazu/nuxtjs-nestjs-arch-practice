import type { NewUser, User } from '../user';

/** DI トークン（interface は実行時に消えるため Symbol で provide/inject する）。 */
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

/**
 * ユーザー永続化の契約（リポジトリインターフェース）。
 *
 * オニオンアーキテクチャでは **契約をドメイン中核が所有する**（この interface は domain 層に置く）。
 * application 層（auth の各ユースケース）はこの interface にのみ依存し、TypeORM を知らない。
 * 実装は infrastructure 層（TypeOrmUserRepository）が提供し、DI で注入する。
 */
export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(input: NewUser): Promise<User>;
}
