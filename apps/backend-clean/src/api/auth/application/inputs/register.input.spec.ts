import { toRegisterInput } from './register.input';

describe('toRegisterInput（契約 RegisterRequest → RegisterInput）', () => {
  it('正常系: email/password/displayName をそのまま写し取る', () => {
    const input = toRegisterInput({
      email: 'taro@example.com',
      password: 'password123',
      displayName: 'taro',
    });

    expect(input).toEqual({
      email: 'taro@example.com',
      password: 'password123',
      displayName: 'taro',
    });
  });
});
