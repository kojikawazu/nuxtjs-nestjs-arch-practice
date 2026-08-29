import { User } from '../../domain/entities/user';
import { UserOrmEntity } from '../entities/user.orm-entity';

/** TypeORM Entity → ドメイン User（永続化済み状態の復元）。 */
export function ormToUser(orm: UserOrmEntity): User {
  return User.fromState({
    id: orm.id,
    email: orm.email,
    passwordHash: orm.passwordHash,
    displayName: orm.displayName,
    createdAt: orm.createdAt,
    updatedAt: orm.updatedAt,
  });
}
