import { toLoginInput } from './login.input';

describe('toLoginInput（契約 LoginRequest → LoginInput）', () => {
  it('正常系: email/password をそのまま写し取る', () => {
    const input = toLoginInput({ email: 'taro@example.com', password: 'password123' });

    expect(input).toEqual({ email: 'taro@example.com', password: 'password123' });
  });
});
