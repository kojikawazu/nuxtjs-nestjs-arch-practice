import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { PasswordHasher } from '../domain/services/password-hasher';

/** bcrypt のコスト係数。DTO 側で 8〜72 文字に制限し bcrypt の 72 バイト制約に整合させる。 */
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
