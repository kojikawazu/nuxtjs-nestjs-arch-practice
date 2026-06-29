import { BcryptPasswordHasher } from './bcrypt-password-hasher';

/**
 * bcrypt は「純粋な計算」なので本物を使い、ハッシュ化と照合のロジックを実際に検証する
 * （外部 I/O ではないためモックしない）。
 */
describe('BcryptPasswordHasher（実 bcrypt）', () => {
  const hasher = new BcryptPasswordHasher();

  it('正常系: ハッシュは平文と異なり、同じ平文では照合に成功する', async () => {
    const hash = await hasher.hash('password123');

    expect(hash).not.toBe('password123');
    expect(await hasher.compare('password123', hash)).toBe(true);
  });

  it('異常系: 異なる平文は照合に失敗する', async () => {
    const hash = await hasher.hash('password123');

    expect(await hasher.compare('wrong-password', hash)).toBe(false);
  });
});
