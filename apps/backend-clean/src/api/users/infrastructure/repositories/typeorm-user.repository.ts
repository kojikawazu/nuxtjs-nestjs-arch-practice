import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { NewUser, User } from '../../domain/entities/user';
import type { UserRepository } from '../../application/ports/user-repository.port';
import { EmailAlreadyRegisteredError } from '../../domain/errors/user.errors';
import { isUniqueViolationError } from '../../../../shared/infrastructure/errors/unique-violation';
import { ormToUser } from '../mappers/user.mapper';
import { UserOrmEntity } from '../entities/user.orm-entity';

/** UserRepository Port の TypeORM 実装（infrastructure 層）。 */
@Injectable()
export class TypeOrmUserRepository implements UserRepository {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly repo: Repository<UserOrmEntity>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.repo.findOne({ where: { email } });
    return row ? ormToUser(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? ormToUser(row) : null;
  }

  /**
   * ユーザーを作成する。一意制約違反は EmailAlreadyRegisteredError（409）へ翻訳する。
   *
   * 呼び出し側は事前に findByEmail で重複を弾いているが、確認と INSERT の間に他の要求が
   * 同じメールを作れてしまう（check-then-act）。原子性を持つのは DB の一意制約だけなので、
   * ここが並行登録に対する最後の砦になる。`users` の一意制約は email の 1 本だけなので、
   * このテーブルでの一意制約違反はメール重複を意味する（列を足すときはここも見直す）。
   * それ以外の DB エラーは翻訳せず、そのまま throw して 500 として扱う（握りつぶさない）。
   */
  async create(input: NewUser): Promise<User> {
    try {
      const saved = await this.repo.save(this.repo.create(input));
      return ormToUser(saved);
    } catch (error) {
      if (isUniqueViolationError(error)) {
        throw new EmailAlreadyRegisteredError();
      }
      throw error;
    }
  }
}
