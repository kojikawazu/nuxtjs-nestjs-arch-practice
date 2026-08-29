import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { PasswordHasher } from '../../domain/services/password-hasher';

/** bcrypt のコスト係数。72 バイト超は bcrypt が切り捨てるため、DTO 側で UTF-8 72 バイト以内に制限している。 */
const PASSWORD_SALT_ROUNDS = 12;

/** PasswordHasher（domain 契約）の bcrypt 実装（infrastructure 層）。 */
@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, PASSWORD_SALT_ROUNDS);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
