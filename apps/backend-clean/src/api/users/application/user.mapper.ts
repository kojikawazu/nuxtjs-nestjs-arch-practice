import type { User as UserContract } from '@app/api-client';
import type { User } from '../domain/user';

/**
 * ドメイン User → API 契約形（@app/api-client の User）。
 * `passwordHash` は契約に存在せず、ここで構造的に落とす（決して漏らさない）。
 */
export function toContractUser(user: User): UserContract {
  const s = user.toState();
  return {
    id: s.id,
    email: s.email,
    displayName: s.displayName,
    createdAt: s.createdAt.toISOString(),
  };
}
