import {
  EMAIL,
  asUserRepo,
  buildUser,
  createUserRepoMock,
  type UserRepoMock,
} from '../../../../../test/fakes/auth-fakes';
import { EmailAlreadyRegisteredError } from '../../domain/errors/auth.errors';
import { RegisterValidator } from './register.validator';

describe('RegisterValidator（DryRun・保存しない）', () => {
  let users: UserRepoMock;
  let validator: RegisterValidator;

  beforeEach(() => {
    users = createUserRepoMock();
    validator = new RegisterValidator(asUserRepo(users));
  });

  it('正常系: 未登録メールは検証を通り、作成は行わない', async () => {
    users.findByEmail.mockResolvedValue(null);

    await expect(
      validator.execute({ email: 'new@example.com', password: 'password123', displayName: 'new' }),
    ).resolves.toBeUndefined();

    expect(users.findByEmail).toHaveBeenCalledWith('new@example.com');
    expect(users.create).not.toHaveBeenCalled();
  });

  it('準正常系: 既登録メールは EmailAlreadyRegisteredError（作成はしない）', async () => {
    users.findByEmail.mockResolvedValue(buildUser());

    await expect(
      validator.execute({ email: EMAIL, password: 'password123', displayName: 'taro' }),
    ).rejects.toBeInstanceOf(EmailAlreadyRegisteredError);
    expect(users.create).not.toHaveBeenCalled();
  });
});
