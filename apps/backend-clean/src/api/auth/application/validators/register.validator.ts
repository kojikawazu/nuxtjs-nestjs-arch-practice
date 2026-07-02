import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../users/application/ports/user-repository.port';
import { EmailAlreadyRegisteredError } from '../../domain/auth.errors';
import type { RegisterInput } from '../inputs/register.input';

/**
 * 登録の DryRun（検証のみ・保存しない）。
 * DTO 検証は ZodValidationPipe が済ませている前提で、ここでは業務ルール（メール重複）だけを確認する。
 * ユーザー作成・トークン発行は一切行わない（重複 → 409 はそのまま伝播）。
 */
@Injectable()
export class RegisterValidator {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async execute(input: RegisterInput): Promise<void> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new EmailAlreadyRegisteredError();
    }
  }
}
