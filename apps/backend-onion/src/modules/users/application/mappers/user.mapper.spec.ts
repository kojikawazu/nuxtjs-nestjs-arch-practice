import { User } from '../../domain/entities/user';
import { toContractUser } from './user.mapper';

describe('toContractUser（domain User → 契約 User）', () => {
  const build = () =>
    User.fromState({
      id: 'user-1',
      email: 'taro@example.com',
      passwordHash: 'secret-hash',
      displayName: 'taro',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    });

  it('正常系: id/email/displayName と ISO 化した createdAt を返す', () => {
    const dto = toContractUser(build());

    expect(dto).toEqual({
      id: 'user-1',
      email: 'taro@example.com',
      displayName: 'taro',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('準正常系: passwordHash は契約に絶対に含めない（漏洩防止）', () => {
    const dto = toContractUser(build());

    expect(dto).not.toHaveProperty('passwordHash');
  });
});
