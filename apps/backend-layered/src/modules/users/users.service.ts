import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { User } from '@app/api-client';
import { isUniqueViolationError } from '../../common/errors/unique-violation';
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

  /**
   * ユーザーを作成する。一意制約違反は 409（メール重複）へ翻訳する。
   *
   * AuthService.register は事前に findByEmail で重複を弾いているが、確認と INSERT の間に
   * 他の要求が同じメールを作れてしまう（check-then-act）。原子性を持つのは DB の一意制約だけなので、
   * ここが並行登録に対する最後の砦になる。`users` の一意制約は email の 1 本だけなので、
   * このテーブルでの一意制約違反はメール重複を意味する（列を足すときはここも見直す）。
   * それ以外の DB エラーは翻訳せず、そのまま throw して 500 として扱う（握りつぶさない）。
   */
  async create(input: CreateUserInput): Promise<UserEntity> {
    try {
      const user = this.users.create(input);
      return await this.users.save(user);
    } catch (error) {
      if (isUniqueViolationError(error)) {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
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
