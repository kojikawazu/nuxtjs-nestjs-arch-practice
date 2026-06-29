import { toLoginInput } from './login.input';

describe('toLoginInput（契約 LoginRequest → LoginInput）', () => {
  it('正常系: email/password を写し取り、余計なキーを増やさない', () => {
    const input = toLoginInput({ email: 'taro@example.com', password: 'password123' });

    expect(input).toEqual({ email: 'taro@example.com', password: 'password123' });
  });
});
