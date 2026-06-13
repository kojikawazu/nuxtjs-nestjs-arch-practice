import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { User } from '@app/api-client';
import { UserEntity } from './user.entity';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  displayName: string;
}

/**
 * ユーザーの永続化を担う application/infrastructure 境界。
 * ビジネスロジック（パスワード照合・トークン発行）は AuthService が持つ。
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.users.findOne({ where: { email } });
  }

  findById(id: string): Promise<UserEntity | null> {
    return this.users.findOne({ where: { id } });
  }

  async create(input: CreateUserInput): Promise<UserEntity> {
    const user = this.users.create(input);
    return this.users.save(user);
  }

  /** 契約 (api-client の User) 形へのマッパー。passwordHash は決して漏らさない。 */
  static toPublicUser(entity: UserEntity): User {
    return {
      id: entity.id,
      email: entity.email,
      displayName: entity.displayName,
      createdAt: entity.createdAt.toISOString(),
    };
  }
}
