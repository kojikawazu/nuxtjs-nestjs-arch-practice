import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { NewUser, User } from '../domain/user';
import type { UserRepository } from '../domain/repositories/user.repository';
import { ormToUser } from './user.mapper';
import { UserOrmEntity } from './user.orm-entity';

/** UserRepository（domain 契約）の TypeORM 実装（infrastructure 層）。 */
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

  async create(input: NewUser): Promise<User> {
    const saved = await this.repo.save(this.repo.create(input));
    return ormToUser(saved);
  }
}
